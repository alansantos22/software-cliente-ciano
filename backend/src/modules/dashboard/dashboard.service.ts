import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { QuotaSystemState } from '../quotas/entities/quota-system-state.entity';
import { Earning } from '../earnings/entities/earning.entity';
import { QuotaTransaction } from '../quotas/entities/quota-transaction.entity';
import { GlobalFinancialSettings } from '../admin/entities/global-financial-settings.entity';
import { TransactionType, TransactionStatus } from '../../shared/interfaces/enums';
import { getCurrentPeriod } from '../../shared/utils/helpers';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(QuotaSystemState) private readonly stateRepo: Repository<QuotaSystemState>,
    @InjectRepository(Earning) private readonly earningRepo: Repository<Earning>,
    @InjectRepository(QuotaTransaction) private readonly txnRepo: Repository<QuotaTransaction>,
    @InjectRepository(GlobalFinancialSettings) private readonly settingsRepo: Repository<GlobalFinancialSettings>,
  ) {}

  async getKpis(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return null;

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
      select: ['id'],
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

    return {
      quotaBalance: user.quotaBalance,
      purchasedQuotas: user.purchasedQuotas,
      adminGrantedQuotas: user.adminGrantedQuotas ?? 0,
      splitQuotas: user.splitQuotas,
      estimatedPatrimony: user.quotaBalance * Number(state?.currentQuotaPrice || 2000),
      currentPrice: Number(state?.currentQuotaPrice || 2000),
      totalEarnings: Number(user.totalEarnings),
      monthEarnings: parseFloat(monthEarnings?.total || '0'),
      directCount: user.directCount,
      teamCount: user.teamCount,
      title: user.title,
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
