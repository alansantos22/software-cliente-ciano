import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PayoutRequest } from './entities/payout-request.entity';
import { MonthlyPayoutSummary } from './entities/monthly-payout-summary.entity';
import { AdminPaymentCheck } from '../admin/entities/admin-payment-check.entity';
import { User } from '../users/entities/user.entity';
import { Earning } from '../earnings/entities/earning.entity';
import { GlobalFinancialSettings } from '../admin/entities/global-financial-settings.entity';
import { PayoutStatus } from '../../shared/interfaces/enums';
import { getCurrentPeriod } from '../../shared/utils/helpers';

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    @InjectRepository(PayoutRequest) private readonly payoutRepo: Repository<PayoutRequest>,
    @InjectRepository(MonthlyPayoutSummary) private readonly summaryRepo: Repository<MonthlyPayoutSummary>,
    @InjectRepository(AdminPaymentCheck) private readonly checkRepo: Repository<AdminPaymentCheck>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Earning) private readonly earningRepo: Repository<Earning>,
    @InjectRepository(GlobalFinancialSettings) private readonly settingsRepo: Repository<GlobalFinancialSettings>,
  ) {}

  /**
   * "A receber" do usuário.
   *
   * No modelo admin-driven o usuário não estima o próprio pagamento — o que
   * ele tem a receber são os lotes gerados pelo admin ainda não pagos
   * (status PENDING ou PROCESSING). Ao concluir (COMPLETED), o valor migra
   * para os ganhos da vida.
   *
   * Observação: o filtro antigo usava `status = 'approved'`, valor que não
   * existe no enum EarningStatus — por isso o endpoint sempre devolvia zero.
   */
  async calculateDistribution(userId: string) {
    const receivables = await this.payoutRepo.find({
      where: { userId, status: In([PayoutStatus.PENDING, PayoutStatus.PROCESSING]) },
      order: { paymentMonth: 'ASC' },
    });

    // Desconta a parte já paga em cada lote (pagamento parcial bônus/dividendos).
    const networkEarnings = receivables.reduce(
      (s, p) => s + (p.bonusPaidAt ? 0 : Number(p.networkAmount || 0)),
      0,
    );
    const quotaEarnings = receivables.reduce(
      (s, p) => s + (p.dividendPaidAt ? 0 : Number(p.quotaAmount || 0)),
      0,
    );
    const estimatedPayout = networkEarnings + quotaEarnings;

    return {
      month: getCurrentPeriod(),
      networkEarnings,
      quotaEarnings,
      estimatedPayout,
      nextPaymentMonth: receivables[0]?.paymentMonth ?? null,
      pendingBatches: receivables.length,
    };
  }

  async requestPayout(
    userId: string,
    quotaAmount: number,
    networkAmount: number,
    pixKeyType: string,
    pixKey: string,
  ) {
    const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    const now = new Date();
    const day = now.getDate();
    const paymentDay = settings?.paymentDay || 15;

    if (day > paymentDay) {
      throw new BadRequestException('Janela de pagamento fechada');
    }

    const totalAmount = quotaAmount + networkAmount;
    if (totalAmount <= 0) {
      throw new BadRequestException('Valor total deve ser maior que zero');
    }

    const month = getCurrentPeriod();
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado');

    const existing = await this.payoutRepo.findOne({
      where: { userId, referenceMonth: month, status: PayoutStatus.PENDING },
    });

    if (existing) {
      throw new BadRequestException('Já existe uma solicitação pendente para este mês');
    }

    const payout = this.payoutRepo.create({
      userId,
      userName: user.name,
      referenceMonth: month,
      paymentMonth: month,
      quotaAmount,
      networkAmount,
      amount: totalAmount,
      netProfitRef: 0,
      dividendPoolRef: 0,
      pixKeyType: pixKeyType as any,
      pixKey,
      generatedBy: userId,
      status: PayoutStatus.PENDING,
    });

    await this.payoutRepo.save(payout);
    this.logger.log(`💰 Payout requested by ${userId} for R$${totalAmount}`);

    return payout;
  }

  async getMyPayouts(userId: string) {
    return this.payoutRepo.find({
      where: { userId },
      order: { generatedAt: 'DESC' },
    });
  }

  async getMyPayoutDetails(payoutId: string, userId: string) {
    return this.payoutRepo.findOne({
      where: { id: payoutId, userId },
    });
  }

  // ─── Admin Methods ────────────────────────────────────

  async getPendingPayouts() {
    return this.payoutRepo.find({
      where: { status: PayoutStatus.PENDING },
      relations: ['user'],
      order: { generatedAt: 'ASC' },
    });
  }

  async processPayout(payoutId: string, action: 'approve' | 'reject', adminId: string, rejectionReason?: string) {
    const payout = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!payout) throw new BadRequestException('Solicitação não encontrada');
    if (payout.status !== PayoutStatus.PENDING) throw new BadRequestException('Solicitação não está pendente');

    if (action === 'approve') {
      payout.status = PayoutStatus.PROCESSING;
      payout.processedAt = new Date();
    } else {
      payout.status = PayoutStatus.FAILED;
      payout.failureReason = rejectionReason || 'Rejeitado pelo administrador';
    }

    await this.payoutRepo.save(payout);
    return payout;
  }

  async markAsPaid(payoutId: string, adminId: string) {
    const payout = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!payout) throw new BadRequestException('Solicitação não encontrada');
    if (payout.status !== PayoutStatus.PROCESSING) throw new BadRequestException('Payout precisa ser aprovado primeiro');

    payout.status = PayoutStatus.COMPLETED;
    payout.completedAt = new Date();
    await this.payoutRepo.save(payout);

    // Record admin check
    const check = this.checkRepo.create({
      payoutId: payout.id,
      referenceMonth: payout.referenceMonth,
      checkedBy: adminId,
    });
    await this.checkRepo.save(check);

    return payout;
  }

  async getMonthSummary(month: string) {
    const payouts = await this.payoutRepo.find({ where: { referenceMonth: month } });

    const totalRequested = payouts.reduce((s, p) => s + Number(p.amount), 0);
    const totalProcessing = payouts.filter((p) => p.status === PayoutStatus.PROCESSING || p.status === PayoutStatus.COMPLETED).reduce((s, p) => s + Number(p.amount), 0);
    const totalCompleted = payouts.filter((p) => p.status === PayoutStatus.COMPLETED).reduce((s, p) => s + Number(p.amount), 0);

    return {
      month,
      totalRequests: payouts.length,
      totalRequested,
      totalProcessing,
      totalCompleted,
      pending: payouts.filter((p) => p.status === PayoutStatus.PENDING).length,
      processing: payouts.filter((p) => p.status === PayoutStatus.PROCESSING).length,
      completed: payouts.filter((p) => p.status === PayoutStatus.COMPLETED).length,
      failed: payouts.filter((p) => p.status === PayoutStatus.FAILED).length,
    };
  }
}
