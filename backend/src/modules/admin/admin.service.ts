import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, MoreThan } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { QuotaTransaction } from '../quotas/entities/quota-transaction.entity';
import { QuotaSystemState } from '../quotas/entities/quota-system-state.entity';
import { Earning } from '../earnings/entities/earning.entity';
import { PayoutRequest } from '../payouts/entities/payout-request.entity';
import { MonthlyFinancialConfig } from './entities/monthly-financial-config.entity';
import { GlobalFinancialSettings } from './entities/global-financial-settings.entity';
import { TitleRequirement } from './entities/title-requirement.entity';
import { SplitEngineService } from '../../core/split/split-engine.service';
import { BonusType, PayoutStatus, TransactionType, TransactionStatus } from '../../shared/interfaces/enums';
import { getCurrentPeriod } from '../../shared/utils/helpers';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(QuotaTransaction) private readonly txnRepo: Repository<QuotaTransaction>,
    @InjectRepository(QuotaSystemState) private readonly stateRepo: Repository<QuotaSystemState>,
    @InjectRepository(Earning) private readonly earningRepo: Repository<Earning>,
    @InjectRepository(PayoutRequest) private readonly payoutRepo: Repository<PayoutRequest>,
    @InjectRepository(MonthlyFinancialConfig) private readonly monthlyConfigRepo: Repository<MonthlyFinancialConfig>,
    @InjectRepository(GlobalFinancialSettings) private readonly settingsRepo: Repository<GlobalFinancialSettings>,
    @InjectRepository(TitleRequirement) private readonly titleReqRepo: Repository<TitleRequirement>,
    private readonly splitEngine: SplitEngineService,
  ) {}

  // ─── Dashboard ─────────────────────────────────────────

  async getDashboardKpis() {
    const month = getCurrentPeriod();
    const now = new Date();
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const activeUsers = await this.userRepo.count({
      where: { lastPurchaseDate: MoreThan(sixMonthsAgo), deletedAt: IsNull() },
    });

    const totalUsersCount = await this.userRepo.count({ where: { deletedAt: IsNull() } });

    const monthRevenueRow = await this.txnRepo
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where('t.type = :type', { type: TransactionType.PURCHASE })
      .andWhere('t.reference_month = :month', { month })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();

    const prevMonthRevenueRow = await this.txnRepo
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where('t.type = :type', { type: TransactionType.PURCHASE })
      .andWhere('t.reference_month = :month', { month: prevMonth })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();

    const totalRevenueRow = await this.txnRepo
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where('t.type = :type', { type: TransactionType.PURCHASE })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();

    const monthQuotasRow = await this.txnRepo
      .createQueryBuilder('t')
      .select('SUM(t.quotas_affected)', 'total')
      .where('t.type = :type', { type: TransactionType.PURCHASE })
      .andWhere('t.reference_month = :month', { month })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();

    const prevMonthQuotasRow = await this.txnRepo
      .createQueryBuilder('t')
      .select('SUM(t.quotas_affected)', 'total')
      .where('t.type = :type', { type: TransactionType.PURCHASE })
      .andWhere('t.reference_month = :month', { month: prevMonth })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();

    const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    const dividendPoolPercent = settings?.profitPayoutPercentage || 20;

    const monthRev = parseFloat(monthRevenueRow?.total || '0');
    const prevMonthRev = parseFloat(prevMonthRevenueRow?.total || '0');
    const totalRev = parseFloat(totalRevenueRow?.total || '0');
    const monthQ = parseInt(monthQuotasRow?.total || '0', 10);
    const prevMonthQ = parseInt(prevMonthQuotasRow?.total || '0', 10);

    const calcTrend = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const pendingPayoutsCount = await this.payoutRepo.count({ where: { status: PayoutStatus.PENDING } });
    const pendingPayoutsTotalRow = await this.payoutRepo
      .createQueryBuilder('p')
      .select('SUM(p.amount)', 'total')
      .where('p.status = :status', { status: PayoutStatus.PENDING })
      .getRawOne();

    return {
      monthRevenue: monthRev,
      monthRevenueTrend: calcTrend(monthRev, prevMonthRev),
      activeUsers,
      retentionRate: totalUsersCount > 0 ? Math.round((activeUsers / totalUsersCount) * 100) : 0,
      monthQuotas: monthQ,
      monthQuotasTrend: calcTrend(monthQ, prevMonthQ),
      totalRevenue: totalRev,
      dividendPool: monthRev * dividendPoolPercent / 100,
      dividendPoolPercent,
      pendingPayoutsCount,
      pendingPayoutsTotal: parseFloat(pendingPayoutsTotalRow?.total || '0'),
    };
  }

  async getSalesChart() {
    const PT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const entries: Array<{ key: string; label: string }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      entries.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: PT_MONTHS[d.getMonth()],
      });
    }

    const result = [];
    for (const { key, label } of entries) {
      const novasRow = await this.txnRepo
        .createQueryBuilder('t')
        .select('SUM(t.quotas_affected)', 'total')
        .where('t.type = :type', { type: TransactionType.PURCHASE })
        .andWhere('t.reference_month = :month', { month: key })
        .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
        .getRawOne();

      result.push({
        label,
        novas: parseInt(novasRow?.total || '0', 10),
        recompra: 0,
      });
    }

    return result;
  }

  async getTitleDistribution() {
    const dist = await this.userRepo
      .createQueryBuilder('u')
      .select('u.title', 'title')
      .addSelect('COUNT(*)', 'count')
      .where('u.deletedAt IS NULL')
      .groupBy('u.title')
      .getRawMany();

    const result: Record<string, number> = { bronze: 0, prata: 0, ouro: 0, diamante: 0 };
    for (const d of dist) {
      const key = (d.title as string)?.toLowerCase();
      if (key in result) result[key] = parseInt(d.count, 10);
    }
    return result;
  }

  async getCrmUsers() {
    return this.userRepo.find({
      where: { deletedAt: IsNull() },
      order: { totalEarnings: 'DESC' },
      select: ['id', 'name', 'title', 'totalEarnings', 'isActive', 'email', 'purchasedQuotas', 'adminGrantedQuotas', 'splitQuotas', 'quotaBalance', 'partnerLevel', 'lastPurchaseDate'],
    });
  }

  // ─── Price Engine ──────────────────────────────────────

  async getPriceEngine() {
    const state = await this.splitEngine.getState();
    
    // Calculate lot progress: how many quotas sold in current lot
    // Target for lot N is 50 * 2^splitCount
    // Previous lot threshold = sum of all previous targets
    // For simplicity: previousTarget = splitCount > 0 ? 50 * (2^splitCount - 1) : 0
    // Actually: each split doubles, so cumulative before current = 50 * (2^splitCount - 1)
    const currentTarget = state.nextEventTarget || 50;
    const previousTarget = state.splitCount > 0 ? 50 * (Math.pow(2, state.splitCount) - 1) : 0;
    const lotSold = Math.max(0, state.totalQuotasSold - previousTarget);
    
    return {
      quotaPrice: Number(state.currentQuotaPrice),
      totalQuotasSold: state.totalQuotasSold,
      splitCount: state.splitCount,
      currentPhase: state.currentPhase,
      nextEventTarget: currentTarget,
      nextEventLabel: state.nextEventLabel,
      lotSize: currentTarget,
      lotSold: lotSold,
      lotNumber: state.splitCount + 1,
      currentConstant: state.currentPhase,
    };
  }

  async updatePriceEngine(forceSplit?: boolean, adjustConstant?: number) {
    if (forceSplit) {
      await this.splitEngine.forceSplit();
      return { message: 'Split forçado executado com sucesso' };
    }

    if (adjustConstant !== undefined) {
      const state = await this.splitEngine.getState();
      state.currentPhase = adjustConstant;
      state.currentQuotaPrice = 2000 + 500 * adjustConstant;
      await this.stateRepo.save(state);
      return { message: `Constante ajustada para ${adjustConstant}`, newPrice: state.currentQuotaPrice };
    }

    return { message: 'Nenhuma ação executada' };
  }

  // ─── Payouts (Admin-Driven 3-Stage) ────────────────────

  async calculateDistribution(profitMonth: string, netProfit: number) {
    const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    const dividendPoolPercent = settings?.profitPayoutPercentage || 20;
    const dividendPool = netProfit * dividendPoolPercent / 100;

    // paymentMonth = profitMonth + 2
    const [y, m] = profitMonth.split('-').map(Number);
    const paymentDate = new Date(y, m + 1, 1); // +2 months from profitMonth
    const paymentMonth = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;

    // All users with quotas
    const users = await this.userRepo.find({
      where: { deletedAt: IsNull() },
    });

    const totalQuotas = users.reduce((s, u) => s + u.quotaBalance, 0);

    const distributions = users
      .filter((u) => u.quotaBalance > 0)
      .map((u) => {
        const share = totalQuotas > 0 ? u.quotaBalance / totalQuotas : 0;
        const quotaAmount = dividendPool * share;

        return {
          userId: u.id,
          userName: u.name,
          quotaBalance: u.quotaBalance,
          percentageShare: Math.round(share * 10000) / 100,
          quotaAmount: Math.round(quotaAmount * 100) / 100,
          networkAmount: Number(u.totalEarnings), // simplified — ideally filtered by month
          totalAmount: Math.round((quotaAmount + Number(u.totalEarnings)) * 100) / 100,
          pixKey: u.pixKey,
          pixKeyType: u.pixKeyType,
        };
      });

    return {
      profitMonth,
      paymentMonth,
      netProfit,
      dividendPoolPercent,
      dividendPool,
      totalQuotasInSystem: totalQuotas,
      distributions,
    };
  }

  async generateBatch(profitMonth: string, netProfit: number, adminId: string) {
    const preview = await this.calculateDistribution(profitMonth, netProfit);

    // Check for existing batch
    const existing = await this.payoutRepo.findOne({ where: { referenceMonth: profitMonth } });
    if (existing) {
      return { error: 'Já existe um lote para este mês de referência' };
    }

    const payouts: PayoutRequest[] = [];
    for (const dist of preview.distributions) {
      const payout = this.payoutRepo.create({
        userId: dist.userId,
        userName: dist.userName,
        referenceMonth: profitMonth,
        paymentMonth: preview.paymentMonth,
        quotaAmount: dist.quotaAmount,
        networkAmount: dist.networkAmount,
        amount: dist.totalAmount,
        percentageShare: dist.percentageShare,
        netProfitRef: netProfit,
        dividendPoolRef: dividendPool,
        pixKey: dist.pixKey,
        pixKeyType: dist.pixKeyType as any,
        generatedBy: adminId,
        status: PayoutStatus.PENDING,
      });
      payouts.push(payout);
    }

    await this.payoutRepo.save(payouts);
    this.logger.log(`📋 Batch generated for ${profitMonth}: ${payouts.length} payouts`);

    return {
      profitMonth,
      paymentMonth: preview.paymentMonth,
      totalPayouts: payouts.length,
      totalAmount: payouts.reduce((s, p) => s + Number(p.amount), 0),
    };
  }

  async getPayouts(status?: string, month?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (month) where.referenceMonth = month;

    return this.payoutRepo.find({
      where,
      relations: ['user'],
      order: { generatedAt: 'DESC' },
    });
  }

  async getPayoutStats() {
    const pending = await this.payoutRepo.count({ where: { status: PayoutStatus.PENDING } });
    const processing = await this.payoutRepo.count({ where: { status: PayoutStatus.PROCESSING } });
    const completed = await this.payoutRepo.count({ where: { status: PayoutStatus.COMPLETED } });
    const failed = await this.payoutRepo.count({ where: { status: PayoutStatus.FAILED } });

    const pendingTotalRow = await this.payoutRepo
      .createQueryBuilder('p')
      .select('SUM(p.amount)', 'total')
      .where('p.status = :status', { status: PayoutStatus.PENDING })
      .getRawOne();

    return {
      pending,
      processing,
      completed,
      failed,
      total: pending + processing + completed + failed,
      pendingCount: pending,
      pendingTotal: parseFloat(pendingTotalRow?.total || '0'),
    };
  }

  async processPayoutAction(payoutId: string, action: string, transactionId?: string, failureReason?: string) {
    const payout = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!payout) return null;

    if (action === 'processing') {
      payout.status = PayoutStatus.PROCESSING;
      payout.processedAt = new Date();
    } else if (action === 'completed') {
      payout.status = PayoutStatus.COMPLETED;
      payout.completedAt = new Date();
    } else if (action === 'failed') {
      payout.status = PayoutStatus.FAILED;
      payout.failureReason = failureReason || '';
    }

    await this.payoutRepo.save(payout);
    return payout;
  }

  async bulkPayoutAction(payoutIds: string[], action: string, transactionId?: string) {
    const results = [];
    for (const id of payoutIds) {
      const result = await this.processPayoutAction(id, action, transactionId);
      results.push(result);
    }
    return results;
  }

  // ─── Financial Config ──────────────────────────────────

  async getFinancialConfig() {
    return this.settingsRepo.findOne({ where: { id: 1 } });
  }

  async updateFinancialConfig(data: Partial<GlobalFinancialSettings>) {
    await this.settingsRepo.save({ id: 1, ...data });
    return this.settingsRepo.findOne({ where: { id: 1 } });
  }

  async getMonthlyConfig(month: string) {
    let config = await this.monthlyConfigRepo.findOne({ where: { month } });
    if (!config) {
      const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
      config = this.monthlyConfigRepo.create({
        month,
        firstPurchaseBonusPercent: 10,
        repurchaseBonusL1Percent: 5,
        repurchaseBonusL2to6Percent: 2,
        teamBonusPercent: 2,
        dividendPoolPercent: settings?.profitPayoutPercentage || 20,
        isLocked: false,
      });
      await this.monthlyConfigRepo.save(config);
    }
    return config;
  }

  async updateMonthlyConfig(month: string, data: Partial<MonthlyFinancialConfig>) {
    const config = await this.getMonthlyConfig(month);
    if (config.isLocked) return { error: 'Mês já está fechado' };

    Object.assign(config, data);
    await this.monthlyConfigRepo.save(config);
    return config;
  }

  async closeMonth(month: string) {
    const config = await this.getMonthlyConfig(month);
    config.isLocked = true;
    await this.monthlyConfigRepo.save(config);
    return { message: `Mês ${month} fechado com sucesso` };
  }

  // ─── Presentation Metrics ──────────────────────────────

  async getPresentationMetrics() {
    const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    return settings?.presentationMetrics || {};
  }

  async updatePresentationMetrics(metrics: Record<string, any>) {
    await this.settingsRepo.update(1, { presentationMetrics: metrics });
    return { message: 'Métricas atualizadas' };
  }

  // ─── Career Plan ───────────────────────────────────────

  async getCareerPlan() {
    return this.titleReqRepo.find({ order: { title: 'ASC' } });
  }

  async updateCareerPlan(titleId: number, data: Partial<TitleRequirement>) {
    await this.titleReqRepo.update(titleId, data);
    return this.titleReqRepo.findOne({ where: { id: titleId } });
  }

  // ─── Audit Log ─────────────────────────────────────────

  async getTransactionLog(filters: { type?: string; userId?: string; month?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);
    const skip = (page - 1) * limit;

    const qb = this.txnRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.user', 'u')
      .orderBy('t.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (filters.type) {
      qb.andWhere('t.type = :type', { type: filters.type });
    }
    if (filters.userId) {
      qb.andWhere('t.user_id = :userId', { userId: filters.userId });
    }
    if (filters.month) {
      qb.andWhere('t.reference_month = :month', { month: filters.month });
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      total,
      page,
      limit,
      items: items.map(t => ({
        id: t.id,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
        type: t.type,
        status: t.status,
        amount: Number(t.amount),
        quotasAffected: t.quotasAffected,
        description: t.description,
        referenceMonth: t.referenceMonth,
        userId: t.userId,
        userName: (t.user as any)?.name || '—',
        userEmail: (t.user as any)?.email || '—',
      })),
    };
  }
}
