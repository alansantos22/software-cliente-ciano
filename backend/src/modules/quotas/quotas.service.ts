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
import { PagBankService } from '../payments/pagbank.service';
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
    private readonly pagBank: PagBankService,
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
      adminGrantedQuotas: user.adminGrantedQuotas ?? 0,
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

  /**
   * Inicia a compra de cotas. NÃO credita nada ainda: cria a transação como
   * WAITING_PAYMENT, abre um checkout no PagBank e devolve o link de
   * pagamento (redirect). As cotas/bônus/split só são creditados quando o
   * webhook confirma o pagamento (ver `confirmPayment`).
   */
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
    const description = `Compra de ${quantity} cota(s) a R$${price.toFixed(2)}`;

    // 1. Cria a transação PENDENTE de pagamento (nada é creditado aqui).
    const txn = this.txnRepo.create({
      userId: user.id,
      type: TransactionType.PURCHASE,
      amount: totalAmount,
      quotasAffected: quantity,
      description,
      status: TransactionStatus.WAITING_PAYMENT,
      gateway: 'pagbank',
      referenceMonth: month,
    });
    await this.txnRepo.save(txn);

    // 2. Cria o checkout no PagBank e guarda o link de pagamento.
    const { checkoutId, paymentUrl } = await this.pagBank.createCheckout({
      referenceId: txn.id,
      amount: totalAmount,
      quantity,
      unitAmount: price,
      description,
      customer: { name: user.name, email: user.email, cpf: user.cpf, phone: user.phone },
    });

    txn.gatewayCheckoutId = checkoutId;
    txn.paymentUrl = paymentUrl;
    await this.txnRepo.save(txn);

    this.logger.log(`🧾 Checkout iniciado: ${user.name} → ${quantity} cota(s) (txn ${txn.id})`);

    return {
      transactionId: txn.id,
      quantity,
      totalAmount,
      unitPrice: price,
      status: txn.status,
      paymentUrl,
    };
  }

  /**
   * Confirma o pagamento de uma transação (chamado pelo webhook do gateway
   * quando o status vira PAID). Credita cotas, dispara bônus, split e títulos.
   *
   * IDEMPOTENTE: se a transação já estiver COMPLETED, retorna sem reprocessar
   * — o PagBank pode reenviar a mesma notificação várias vezes.
   */
  async confirmPayment(transactionId: string, gatewayOrderId?: string): Promise<void> {
    const txn = await this.txnRepo.findOne({ where: { id: transactionId } });
    if (!txn) {
      this.logger.warn(`confirmPayment: transação ${transactionId} não encontrada`);
      return;
    }
    if (txn.status === TransactionStatus.COMPLETED) {
      this.logger.log(`confirmPayment: txn ${transactionId} já confirmada — ignorando`);
      return;
    }
    if (txn.type !== TransactionType.PURCHASE) {
      this.logger.warn(`confirmPayment: txn ${transactionId} não é compra — ignorando`);
      return;
    }

    const user = await this.userRepo.findOne({ where: { id: txn.userId } });
    if (!user) {
      this.logger.error(`confirmPayment: usuário ${txn.userId} não encontrado`);
      return;
    }

    const quantity = txn.quotasAffected;
    const totalAmount = Number(txn.amount);
    const isFirstPurchase = user.purchasedQuotas === 0;
    const now = new Date();

    // 1. Marca a transação como paga.
    txn.status = TransactionStatus.COMPLETED;
    txn.paidAt = now;
    txn.completedAt = now;
    if (gatewayOrderId) txn.gatewayOrderId = gatewayOrderId;
    await this.txnRepo.save(txn);

    // 2-5. Credita as cotas e atualiza o nível de sócio.
    user.purchasedQuotas += quantity;
    user.quotaBalance = user.purchasedQuotas + (user.adminGrantedQuotas ?? 0) + user.splitQuotas;
    user.lastPurchaseDate = now;
    user.isActive = true;

    if (user.purchasedQuotas >= 60) user.partnerLevel = 'imperial' as any;
    else if (user.purchasedQuotas >= 20) user.partnerLevel = 'vip' as any;
    else if (user.purchasedQuotas >= 10) user.partnerLevel = 'platinum' as any;
    else user.partnerLevel = 'socio' as any;

    await this.userRepo.save(user);

    // 6. Calcula os bônus de compra/recompra.
    if (isFirstPurchase) {
      await this.bonusCalc.calculateFirstPurchaseBonus(user, totalAmount, now);
    } else {
      await this.bonusCalc.calculateRepurchaseBonus(user, totalAmount, now);
    }

    // 7. Atualiza o estado do sistema (cotas vendidas).
    await this.splitEngine.incrementQuotasSold(quantity);

    // 8. Verifica split/aumento de preço.
    await this.splitEngine.checkAndProcess();

    // Recalcula títulos da linha ascendente.
    if (user.sponsorId) {
      await this.titleCalc.recalculateTitle(user.sponsorId);
    }

    this.logger.log(`✅ Pagamento confirmado: ${user.name} +${quantity} cota(s) por R$${totalAmount}`);
  }

  /**
   * Marca uma transação como recusada/cancelada/expirada (webhook).
   * Não credita nada. Idempotente para transações já finalizadas.
   */
  async markFailed(transactionId: string, status: TransactionStatus): Promise<void> {
    const txn = await this.txnRepo.findOne({ where: { id: transactionId } });
    if (!txn) return;
    // Não reverte um pagamento já confirmado por uma notificação tardia.
    if (txn.status === TransactionStatus.COMPLETED) return;
    txn.status = status;
    await this.txnRepo.save(txn);
    this.logger.log(`⚠️ Transação ${transactionId} marcada como ${status}`);
  }

  /** Status atual de uma transação (usado pelo polling do frontend). */
  async getStatus(transactionId: string, userId: string) {
    const txn = await this.txnRepo.findOne({ where: { id: transactionId, userId } });
    if (!txn) throw new BadRequestException('Transação não encontrada');
    return {
      transactionId: txn.id,
      status: txn.status,
      paidAt: txn.paidAt,
      quantity: txn.quotasAffected,
      totalAmount: Number(txn.amount),
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
