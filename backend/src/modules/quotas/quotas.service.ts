import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuotaTransaction } from './entities/quota-transaction.entity';
import { QuotaSystemState } from './entities/quota-system-state.entity';
import { SplitEvent } from './entities/split-event.entity';
import { User } from '../users/entities/user.entity';
import { GlobalFinancialSettings } from '../admin/entities/global-financial-settings.entity';
import { PartnerLevelRequirement } from '../admin/entities/partner-level-requirement.entity';
import { BonusCalculatorService } from '../../core/bonus/bonus-calculator.service';
import { SplitEngineService } from '../../core/split/split-engine.service';
import { TitleCalculatorService } from '../../core/title/title-calculator.service';
import { TransactionType, TransactionStatus } from '../../shared/interfaces/enums';
import { getCurrentPeriod } from '../../shared/utils/helpers';

@Injectable()
export class QuotasService {
  private readonly logger = new Logger(QuotasService.name);

  constructor(
    @InjectRepository(QuotaTransaction) private readonly txnRepo: Repository<QuotaTransaction>,
    @InjectRepository(QuotaSystemState) private readonly stateRepo: Repository<QuotaSystemState>,
    @InjectRepository(SplitEvent) private readonly splitEventRepo: Repository<SplitEvent>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(GlobalFinancialSettings) private readonly settingsRepo: Repository<GlobalFinancialSettings>,
    @InjectRepository(PartnerLevelRequirement) private readonly partnerReqRepo: Repository<PartnerLevelRequirement>,
    private readonly bonusCalc: BonusCalculatorService,
    private readonly splitEngine: SplitEngineService,
    private readonly titleCalc: TitleCalculatorService,
  ) {}

  async getConfig() {
    const state = await this.splitEngine.getState();
    const settings = await this.settingsRepo.findOne({ where: { id: 1 } });

    // Get estimated yield from presentation metrics or use default
    const presentationMetrics = settings?.presentationMetrics as Record<string, unknown> | null;
    const estimatedYieldPerQuota = Number(presentationMetrics?.estimatedYieldPerQuota) || 200;

    return {
      currentPrice: Number(state.currentQuotaPrice),
      totalQuotasSold: state.totalQuotasSold,
      splitCount: state.splitCount,
      currentPhase: state.currentPhase,
      nextEventTarget: state.nextEventTarget,
      nextEventLabel: state.nextEventLabel,
      minQuotas: settings?.minQuotas || 1,
      maxQuotasPerUser: settings?.maxQuotasPerUser || 200,
      totalQuotasAvailable: settings?.totalQuotasAvailable || 10000,
      estimatedYieldPerQuota,
    };
  }

  async getBalance(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado');

    const state = await this.splitEngine.getState();

    return {
      purchasedQuotas: user.purchasedQuotas,
      splitQuotas: user.splitQuotas,
      quotaBalance: user.quotaBalance,
      currentPrice: Number(state.currentQuotaPrice),
      estimatedPatrimony: user.quotaBalance * Number(state.currentQuotaPrice),
    };
  }

  async getTransactions(userId: string) {
    return this.txnRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async purchase(userId: string, quantity: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado');

    const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    const state = await this.splitEngine.getState();
    const price = Number(state.currentQuotaPrice);
    const totalAmount = price * quantity;

    // Validations
    if (quantity < (settings?.minQuotas || 1)) {
      throw new BadRequestException(`Mínimo de ${settings?.minQuotas || 1} cotas por compra`);
    }

    const newTotal = user.purchasedQuotas + quantity;
    if (newTotal > (settings?.maxQuotasPerUser || 200)) {
      throw new BadRequestException(`Máximo de ${settings?.maxQuotasPerUser || 200} cotas por usuário`);
    }

    const month = getCurrentPeriod();
    const isFirstPurchase = user.purchasedQuotas === 0;

    // 1. Create transaction
    const txn = this.txnRepo.create({
      userId: user.id,
      type: TransactionType.PURCHASE,
      amount: totalAmount,
      quotasAffected: quantity,
      description: `Compra de ${quantity} cota(s) a R$${price.toFixed(2)}`,
      status: TransactionStatus.COMPLETED,
      referenceMonth: month,
      completedAt: new Date(),
    });
    await this.txnRepo.save(txn);

    // 2-5. Update user quotas and partner level
    user.purchasedQuotas += quantity;
    user.quotaBalance = user.purchasedQuotas + user.splitQuotas;
    user.lastPurchaseDate = new Date();
    user.isActive = true;

    // Recalculate partner level
    if (user.purchasedQuotas >= 60) user.partnerLevel = 'imperial' as any;
    else if (user.purchasedQuotas >= 20) user.partnerLevel = 'vip' as any;
    else if (user.purchasedQuotas >= 10) user.partnerLevel = 'platinum' as any;
    else user.partnerLevel = 'socio' as any;

    await this.userRepo.save(user);

    // 6. Calculate bonuses
    if (isFirstPurchase) {
      await this.bonusCalc.calculateFirstPurchaseBonus(user, totalAmount, new Date());
    } else {
      await this.bonusCalc.calculateRepurchaseBonus(user, totalAmount, new Date());
    }

    // 7. Update system state
    await this.splitEngine.incrementQuotasSold(quantity);

    // 8. Check for split/price increase
    await this.splitEngine.checkAndProcess();

    // Recalculate titles for upline
    if (user.sponsorId) {
      await this.titleCalc.recalculateTitle(user.sponsorId);
    }

    this.logger.log(`🛒 ${user.name} purchased ${quantity} quota(s) for R$${totalAmount}`);

    return {
      transactionId: txn.id,
      quantity,
      totalAmount,
      unitPrice: price,
      status: txn.status,
    };
  }

  async getConfirmation(transactionId: string, userId: string) {
    const txn = await this.txnRepo.findOne({
      where: { id: transactionId, userId },
    });

    if (!txn) throw new BadRequestException('Transação não encontrada');

    return txn;
  }

  async getPresentation() {
    const state = await this.splitEngine.getState();
    const settings = await this.settingsRepo.findOne({ where: { id: 1 } });

    return {
      currentPrice: Number(state.currentQuotaPrice),
      totalQuotasSold: state.totalQuotasSold,
      totalQuotasAvailable: settings?.totalQuotasAvailable || 10000,
      splitCount: state.splitCount,
      presentationMetrics: settings?.presentationMetrics || null,
    };
  }

  async getPartnerLevels() {
    return this.partnerReqRepo.find({ order: { minQuotas: 'ASC' } });
  }
}
