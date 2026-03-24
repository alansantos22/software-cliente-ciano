import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Earning } from './entities/earning.entity';
import { MonthlyEarningSummary } from './entities/monthly-earning-summary.entity';
import { BonusType } from '../../shared/interfaces/enums';
import { getCurrentPeriod } from '../../shared/utils/helpers';

@Injectable()
export class EarningsService {
  constructor(
    @InjectRepository(Earning) private readonly earningRepo: Repository<Earning>,
    @InjectRepository(MonthlyEarningSummary) private readonly summaryRepo: Repository<MonthlyEarningSummary>,
  ) {}

  async getEarnings(userId: string, page = 1, pageSize = 20) {
    const [items, total] = await this.earningRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getOverview(userId: string) {
    const currentMonth = getCurrentPeriod();
    const lastMonth = this.getPreviousMonth(currentMonth);

    const totalEarned = await this.earningRepo
      .createQueryBuilder('e')
      .select('SUM(e.amount)', 'total')
      .where('e.user_id = :userId', { userId })
      .getRawOne();

    const pendingEarnings = await this.earningRepo
      .createQueryBuilder('e')
      .select('SUM(e.amount)', 'total')
      .where('e.user_id = :userId', { userId })
      .andWhere('e.status = :status', { status: 'pending' })
      .getRawOne();

    const thisMonthEarnings = await this.earningRepo
      .createQueryBuilder('e')
      .select('SUM(e.amount)', 'total')
      .where('e.user_id = :userId', { userId })
      .andWhere('e.reference_month = :month', { month: currentMonth })
      .getRawOne();

    const lastMonthEarnings = await this.earningRepo
      .createQueryBuilder('e')
      .select('SUM(e.amount)', 'total')
      .where('e.user_id = :userId', { userId })
      .andWhere('e.reference_month = :month', { month: lastMonth })
      .getRawOne();

    // Calculate average monthly
    const summaryCount = await this.summaryRepo.count({ where: { userId } });
    const allTotal = parseFloat(totalEarned?.total || '0');

    return {
      userId,
      totalEarned: allTotal,
      pendingEarnings: parseFloat(pendingEarnings?.total || '0'),
      thisMonthEarnings: parseFloat(thisMonthEarnings?.total || '0'),
      lastMonthEarnings: parseFloat(lastMonthEarnings?.total || '0'),
      averageMonthly: summaryCount > 0 ? allTotal / summaryCount : 0,
      lossProjection: 0, // Calculated in monthly close
    };
  }

  async getMonthlySummary(userId: string, month: string) {
    let summary = await this.summaryRepo.findOne({
      where: { userId, month },
    });

    if (!summary) {
      // Calculate on the fly
      summary = await this.buildMonthlySummary(userId, month);
    }

    return summary;
  }

  async getByType(userId: string, bonusType: BonusType) {
    return this.earningRepo.find({
      where: { userId, bonusType },
      order: { createdAt: 'DESC' },
    });
  }

  async buildMonthlySummary(userId: string, month: string): Promise<MonthlyEarningSummary> {
    const earnings = await this.earningRepo.find({
      where: { userId, referenceMonth: month },
    });

    const fp = earnings.filter((e) => e.bonusType === BonusType.FIRST_PURCHASE).reduce((s, e) => s + Number(e.amount), 0);
    const rp = earnings.filter((e) => e.bonusType === BonusType.REPURCHASE).reduce((s, e) => s + Number(e.amount), 0);
    const tm = earnings.filter((e) => e.bonusType === BonusType.TEAM).reduce((s, e) => s + Number(e.amount), 0);
    const ld = earnings.filter((e) => e.bonusType === BonusType.LEADERSHIP).reduce((s, e) => s + Number(e.amount), 0);
    const dv = earnings.filter((e) => e.bonusType === BonusType.DIVIDEND).reduce((s, e) => s + Number(e.amount), 0);

    const networkEarnings = fp + rp + tm + ld;
    const total = networkEarnings + dv;

    const [y, m] = month.split('-').map(Number);
    const cutoffDate = new Date(y, m - 1, 0).toISOString().slice(0, 10);

    return {
      userId,
      month,
      firstPurchase: fp,
      repurchase: rp,
      team: tm,
      leadership: ld,
      dividend: dv,
      total,
      networkEarnings,
      quotaEarnings: dv,
      lossProjection: 0,
      cutoffDate,
    } as MonthlyEarningSummary;
  }

  private getPreviousMonth(month: string): string {
    const [y, m] = month.split('-').map(Number);
    const date = new Date(y, m - 2, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}
