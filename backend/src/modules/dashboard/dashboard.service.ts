import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { QuotaSystemState } from '../quotas/entities/quota-system-state.entity';
import { Earning } from '../earnings/entities/earning.entity';
import { QuotaTransaction } from '../quotas/entities/quota-transaction.entity';
import { PayoutRequest } from '../payouts/entities/payout-request.entity';
import { GlobalFinancialSettings } from '../admin/entities/global-financial-settings.entity';
import { TransactionType, TransactionStatus, PayoutStatus, BonusType, EarningStatus } from '../../shared/interfaces/enums';
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

    // ── Previsão a Receber ─────────────────────────────────────────
    // Agrupa o que está a receber por (paymentMonth × tipo). Cada lote
    // virou DOIS pagamentos distintos: bônus de rede em ref+1 e dividendos
    // em ref+2 (regra do cliente, 2026-05). Antes os dois iam juntos em ref+2,
    // o que adiava em 1 mês os bônus de rede.
    const pendingPayouts = await this.payoutRepo.find({
      where: {
        userId,
        status: In([PayoutStatus.PENDING, PayoutStatus.PROCESSING]),
      },
      select: [
        'quotaAmount',
        'networkAmount',
        'amount',
        'paymentMonth',
        'bonusPaymentMonth',
        'dividendPaymentMonth',
        'referenceMonth',
        'bonusPaidAt',
        'dividendPaidAt',
      ],
    });

    const buckets = new Map<string, { bonus: number; dividend: number }>();
    const bumpBucket = (month: string, kind: 'bonus' | 'dividend', amount: number) => {
      if (!month || amount <= 0) return;
      const b = buckets.get(month) ?? { bonus: 0, dividend: 0 };
      b[kind] += amount;
      buckets.set(month, b);
    };

    for (const p of pendingPayouts) {
      // bonusPaymentMonth pode ser null em lotes legados gerados antes da
      // migration 010 — nesses casos retombamos para o paymentMonth velho.
      const bonusMonth = p.bonusPaymentMonth || p.paymentMonth;
      const dividendMonth = p.dividendPaymentMonth || p.paymentMonth;
      if (!p.bonusPaidAt) bumpBucket(bonusMonth, 'bonus', Number(p.networkAmount || 0));
      if (!p.dividendPaidAt) bumpBucket(dividendMonth, 'dividend', Number(p.quotaAmount || 0));
    }

    // Bônus de compra/recompra já lançados mas ainda fora de qualquer lote.
    // Ainda não têm payment_month, então projetamos como ref+1 (mesma regra
    // que o lote vai aplicar quando for gerado).
    const monthsAlreadyInBatch = new Set(
      pendingPayouts.map((p) => p.referenceMonth).filter(Boolean),
    );
    const purchaseEarningsQb = this.earningRepo
      .createQueryBuilder('e')
      .select('e.reference_month', 'refMonth')
      .addSelect('SUM(e.amount)', 'total')
      .where('e.user_id = :userId', { userId })
      .andWhere('e.bonus_type IN (:...types)', {
        types: [BonusType.FIRST_PURCHASE, BonusType.REPURCHASE],
      })
      .andWhere('e.status = :status', { status: EarningStatus.PENDING })
      .groupBy('e.reference_month');
    if (monthsAlreadyInBatch.size > 0) {
      purchaseEarningsQb.andWhere('e.reference_month NOT IN (:...months)', {
        months: [...monthsAlreadyInBatch],
      });
    }
    const purchaseEarningsRows = await purchaseEarningsQb.getRawMany<{
      refMonth: string;
      total: string;
    }>();
    const addOneMonth = (ym: string): string => {
      const [y, m] = ym.split('-').map(Number);
      const d = new Date(y!, m!, 1); // m é 1-12; new Date(y, m, 1) = mês seguinte
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    for (const row of purchaseEarningsRows) {
      const amount = parseFloat(row.total || '0');
      if (amount <= 0 || !row.refMonth) continue;
      bumpBucket(addOneMonth(row.refMonth), 'bonus', amount);
    }

    // ── Janela de pagamento ──
    const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    const paymentDay = settings?.paymentDay || 15;
    const today = new Date();
    const paymentWindowOpen = today.getDate() <= paymentDay;

    const ymToDateStr = (ym: string, day: number) => {
      const [y, m] = ym.split('-').map(Number);
      const dt = new Date(y!, m! - 1, day);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    };

    // Lista ordenada de pagamentos pendentes (por mês cronológico)
    const upcomingPayments = [...buckets.entries()]
      .filter(([, v]) => v.bonus > 0 || v.dividend > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        date: ymToDateStr(month, paymentDay),
        bonus: Math.round(v.bonus * 100) / 100,
        dividend: Math.round(v.dividend * 100) / 100,
        total: Math.round((v.bonus + v.dividend) * 100) / 100,
      }));

    const networkEarnings = upcomingPayments.reduce((s, p) => s + p.bonus, 0);
    const quotaEarnings   = upcomingPayments.reduce((s, p) => s + p.dividend, 0);
    const totalReceivable = networkEarnings + quotaEarnings;

    // Próximo pagamento: primeiro bucket com valor; fallback = mês corrente
    // (avança para o mês seguinte se já passamos do dia de pagamento).
    let nextPaymentDateStr: string;
    let nextPaymentAmount = 0;
    if (upcomingPayments.length > 0) {
      nextPaymentDateStr = upcomingPayments[0].date;
      nextPaymentAmount  = upcomingPayments[0].total;
    } else {
      let nextPayMonth = today.getMonth();
      if (today.getDate() > paymentDay) nextPayMonth += 1;
      const dt = new Date(today.getFullYear(), nextPayMonth, paymentDay);
      nextPaymentDateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    }
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const nextDateObj = new Date(nextPaymentDateStr + 'T12:00:00');
    const daysUntilPayment = Math.round(
      (nextDateObj.getTime() - todayMid.getTime()) / 86_400_000,
    );

    // ── Ganhos da Vida (lifetime) ──
    // Regra do cliente: só conta APÓS o admin confirmar o pagamento. Soma
    // o que foi pago de bônus (bonus_paid_at) e o que foi pago de dividendos
    // (dividend_paid_at) — payouts COMPLETED garantem que ambos os
    // marcadores estão preenchidos. user.totalEarnings continua útil para
    // métricas internas mas NÃO é a fonte aqui.
    const paidPayouts = await this.payoutRepo.find({
      where: { userId },
      select: [
        'amount',
        'networkAmount',
        'quotaAmount',
        'bonusPaidAt',
        'dividendPaidAt',
      ],
    });
    const lifetimeEarnings = paidPayouts.reduce((s, p) => {
      const bonus = p.bonusPaidAt ? Number(p.networkAmount || 0) : 0;
      const dividend = p.dividendPaidAt ? Number(p.quotaAmount || 0) : 0;
      return s + bonus + dividend;
    }, 0);

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
      lifetimeEarnings,
      monthEarnings: parseFloat(monthEarnings?.total || '0'),
      // Previsão a receber
      networkEarnings,
      quotaEarnings,
      totalReceivable,
      nextPaymentAmount,
      upcomingPayments,
      pendingPaymentsCount: upcomingPayments.length,
      // Janela de pagamento
      paymentDay,
      paymentWindowOpen,
      nextPaymentDate: nextPaymentDateStr,
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
    const isOpen = day <= (settings.paymentDay || 15);

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
