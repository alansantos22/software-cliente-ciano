import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { QuotaSystemState } from '../quotas/entities/quota-system-state.entity';
import { Earning } from '../earnings/entities/earning.entity';
import { QuotaTransaction } from '../quotas/entities/quota-transaction.entity';
import { PayoutRequest } from '../payouts/entities/payout-request.entity';
import { GlobalFinancialSettings } from '../admin/entities/global-financial-settings.entity';
import { TransactionType, TransactionStatus, PayoutStatus } from '../../shared/interfaces/enums';
import { getCurrentPeriod } from '../../shared/utils/helpers';
import { TitleCalculatorService } from '../../core/title/title-calculator.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(QuotaSystemState) private readonly stateRepo: Repository<QuotaSystemState>,
    @InjectRepository(Earning) private readonly earningRepo: Repository<Earning>,
    @InjectRepository(QuotaTransaction) private readonly txnRepo: Repository<QuotaTransaction>,
    @InjectRepository(PayoutRequest) private readonly payoutRepo: Repository<PayoutRequest>,
    @InjectRepository(GlobalFinancialSettings) private readonly settingsRepo: Repository<GlobalFinancialSettings>,
    private readonly titleCalc: TitleCalculatorService,
  ) {}

  async getKpis(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return null;

    // 🔄 RECALCULATE TITLE IN REAL-TIME before returning KPIs
    // This ensures the user immediately sees their new title when they qualify
    const currentTitle = await this.titleCalc.recalculateTitle(userId);

    const state = await this.stateRepo.findOne({ where: { id: 1 } });
    const month = getCurrentPeriod();

    const monthEarnings = await this.earningRepo
      .createQueryBuilder('e')
      .select('SUM(e.amount)', 'total')
      .where('e.user_id = :userId', { userId })
      .andWhere('e.reference_month = :month', { month })
      .getRawOne();

    // Cotas compradas pelo próprio usuário neste mês
    const ownPurchaseRow = await this.txnRepo
      .createQueryBuilder('t')
      .select(['SUM(t.quotas_affected) as count', 'SUM(t.amount) as value'])
      .where('t.user_id = :userId', { userId })
      .andWhere('t.type = :type', { type: TransactionType.PURCHASE })
      .andWhere('t.reference_month = :month', { month })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();

    // Cotas compradas pelos diretos da rede neste mês
    const directSponsees = await this.userRepo.find({
      where: { sponsorId: userId, deletedAt: IsNull() },
      select: ['id', 'lastPurchaseDate'],
    });
    let networkSalesCount = 0;
    let networkSalesValue = 0;
    if (directSponsees.length > 0) {
      const sponseeIds = directSponsees.map(u => u.id);
      const networkRow = await this.txnRepo
        .createQueryBuilder('t')
        .select(['SUM(t.quotas_affected) as count', 'SUM(t.amount) as value'])
        .where('t.user_id IN (:...ids)', { ids: sponseeIds })
        .andWhere('t.type = :type', { type: TransactionType.PURCHASE })
        .andWhere('t.reference_month = :month', { month })
        .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
        .getRawOne();
      networkSalesCount = parseInt(networkRow?.count || '0', 10);
      networkSalesValue = parseFloat(networkRow?.value || '0');
    }

    // Network health: active/inactive directs
    const totalDirects = directSponsees.length;
    const activeDirects = directSponsees.filter(
      s => !!s.lastPurchaseDate && this.checkActive(s.lastPurchaseDate),
    ).length;
    const inactiveDirects = totalDirects - activeDirects;

    // ── Previsão a Receber (payouts pendentes/processando) ──
    // Conforme regra do cliente: tudo que está como pendente OU em
    // processamento conta para o usuário receber, independentemente do
    // mês de referência ou pagamento.
    const pendingPayouts = await this.payoutRepo.find({
      where: {
        userId,
        status: In([PayoutStatus.PENDING, PayoutStatus.PROCESSING]),
      },
      select: ['quotaAmount', 'networkAmount', 'amount', 'paymentMonth'],
      order: { paymentMonth: 'ASC' },
    });

    const quotaEarnings   = pendingPayouts.reduce((s, p) => s + Number(p.quotaAmount   || 0), 0);
    const networkEarnings = pendingPayouts.reduce((s, p) => s + Number(p.networkAmount || 0), 0);
    const totalReceivable = pendingPayouts.reduce((s, p) => s + Number(p.amount        || 0), 0);

    // ── Janela de pagamento ──
    const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    const paymentDay = settings?.paymentDay || 15;
    const today = new Date();
    const paymentWindowOpen = today.getDate() <= paymentDay;

    // Próximo pagamento: usa o mês do batch pendente mais antigo
    // (regra ref+2). Caso não haja batch, usa o mês corrente.
    let nextPayYear  = today.getFullYear();
    let nextPayMonth = today.getMonth();
    if (pendingPayouts.length > 0 && pendingPayouts[0].paymentMonth) {
      const [py, pm] = pendingPayouts[0].paymentMonth.split('-').map(Number);
      if (!Number.isNaN(py) && !Number.isNaN(pm)) {
        nextPayYear  = py;
        nextPayMonth = pm - 1;
      }
    }
    const nextPaymentDateObj = new Date(nextPayYear, nextPayMonth, paymentDay);
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const daysUntilPayment = Math.round(
      (nextPaymentDateObj.getTime() - todayMid.getTime()) / 86_400_000,
    );

    // ── Expiração da ativação (lastPurchaseDate + 6 meses) ──
    let daysUntilExpiry: number | null = null;
    if (user.lastPurchaseDate) {
      const expiry = new Date(user.lastPurchaseDate);
      expiry.setMonth(expiry.getMonth() + 6);
      daysUntilExpiry = Math.ceil((expiry.getTime() - Date.now()) / 86_400_000);
    }

    return {
      quotaBalance: user.quotaBalance,
      purchasedQuotas: user.purchasedQuotas,
      adminGrantedQuotas: user.adminGrantedQuotas ?? 0,
      splitQuotas: user.splitQuotas,
      estimatedPatrimony: user.quotaBalance * Number(state?.currentQuotaPrice || 2000),
      currentPrice: Number(state?.currentQuotaPrice || 2000),
      totalEarnings: Number(user.totalEarnings),
      lifetimeEarnings: Number(user.totalEarnings),
      monthEarnings: parseFloat(monthEarnings?.total || '0'),
      // Previsão a receber
      networkEarnings,
      quotaEarnings,
      totalReceivable,
      // Janela de pagamento
      paymentDay,
      paymentWindowOpen,
      nextPaymentDate: nextPaymentDateObj.toISOString(),
      daysUntilPayment,
      // Expiração / inatividade
      daysUntilExpiry,
      inactivityLoss: 0,
      directCount: user.directCount,
      teamCount: user.teamCount,
      activeDirects,
      totalDirects,
      inactiveDirects,
      networkTotal: user.teamCount,
      title: currentTitle,
      partnerLevel: user.partnerLevel,
      isActive: !!user.lastPurchaseDate && this.checkActive(user.lastPurchaseDate),
      ownSalesCount: parseInt(ownPurchaseRow?.count || '0', 10),
      ownSalesValue: parseFloat(ownPurchaseRow?.value || '0'),
      networkSalesCount,
      networkSalesValue,
    };
  }

  async getPaymentWindow() {
    const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    if (!settings) return { isOpen: false };

    const now = new Date();
    const day = now.getDate();
    const isOpen = day <= (settings.paymentDay || 5);

    return {
      isOpen,
      paymentDay: settings.paymentDay,
      currentDay: day,
    };
  }

  async getQuotaChart(userId: string) {
    const state = await this.stateRepo.findOne({ where: { id: 1 } });

    return {
      currentPrice: Number(state?.currentQuotaPrice || 2000),
      totalSold: state?.totalQuotasSold || 0,
      splitCount: state?.splitCount || 0,
      phase: state?.currentPhase || 1,
      nextEventTarget: state?.nextEventTarget || 50,
      nextEventLabel: state?.nextEventLabel || 'Valorização',
    };
  }

  async getRecentActivity(userId: string) {
    return this.earningRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 10,
    });
  }

  async getNotifications(userId: string) {
    // Placeholder — notifications can be event-driven later
    const alerts: { type: string; message: string }[] = [];

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user && user.lastPurchaseDate) {
      const expires = new Date(user.lastPurchaseDate);
      expires.setMonth(expires.getMonth() + 6);
      const daysLeft = Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      if (daysLeft <= 30 && daysLeft > 0) {
        alerts.push({
          type: 'warning',
          message: `Sua ativação expira em ${daysLeft} dias. Faça uma recompra para manter seus benefícios.`,
        });
      } else if (daysLeft <= 0) {
        alerts.push({
          type: 'error',
          message: 'Sua conta está inativa. Faça uma compra para reativar.',
        });
      }
    }

    return alerts;
  }

  async getTopEarners() {
    const earners = await this.userRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.name', 'u.title', 'u.totalEarnings'])
      .where('u.deletedAt IS NULL')
      .orderBy('u.totalEarnings', 'DESC')
      .take(10)
      .getMany();

    return earners.map((u) => ({
      name: u.name,
      title: u.title,
      totalEarnings: Number(u.totalEarnings),
    }));
  }

  private checkActive(lastPurchase: Date): boolean {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return lastPurchase > sixMonthsAgo;
  }
}
