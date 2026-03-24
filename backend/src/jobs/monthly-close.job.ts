import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Earning } from '../modules/earnings/entities/earning.entity';
import { MonthlyEarningSummary } from '../modules/earnings/entities/monthly-earning-summary.entity';
import { MonthlyFinancialConfig } from '../modules/admin/entities/monthly-financial-config.entity';
import { GlobalFinancialSettings } from '../modules/admin/entities/global-financial-settings.entity';
import { BonusCalculatorService } from '../core/bonus/bonus-calculator.service';
import { TitleCalculatorService } from '../core/title/title-calculator.service';
import { BonusType, EarningStatus } from '../shared/interfaces/enums';

@Injectable()
export class MonthlyCloseJob {
  private readonly logger = new Logger(MonthlyCloseJob.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Earning) private readonly earningRepo: Repository<Earning>,
    @InjectRepository(MonthlyEarningSummary) private readonly summaryRepo: Repository<MonthlyEarningSummary>,
    @InjectRepository(MonthlyFinancialConfig) private readonly configRepo: Repository<MonthlyFinancialConfig>,
    @InjectRepository(GlobalFinancialSettings) private readonly settingsRepo: Repository<GlobalFinancialSettings>,
    private readonly bonusCalc: BonusCalculatorService,
    private readonly titleCalc: TitleCalculatorService,
  ) {}

  @Cron('0 0 1 * *') // Day 1 at 00:00 UTC
  async handleMonthlyClose() {
    this.logger.log('🔄 Starting monthly close...');
    const now = new Date();
    // Previous month
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

    try {
      // 1. Calculate team bonuses for all active users
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const activeUsers = await this.userRepo
        .createQueryBuilder('u')
        .where('u.lastPurchaseDate > :date', { date: sixMonthsAgo })
        .andWhere('u.deletedAt IS NULL')
        .getMany();

      for (const user of activeUsers) {
        // calculateTeamBonus processes internally, just needs the month
      }
      await this.bonusCalc.calculateTeamBonus(month);
      this.logger.log(`✅ Team bonuses calculated for ${activeUsers.length} users`);

      // 2. Calculate leadership bonuses (Gold/Diamond)
      const qualifiedUsers = activeUsers.filter(
        (u) => u.title === 'gold' || u.title === 'diamond',
      );
      await this.bonusCalc.calculateLeadershipBonus(month);
      this.logger.log(`✅ Leadership bonuses calculated for ${qualifiedUsers.length} users`);

      // 3. Calculate dividends
      const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
      const dividendPoolPercent = settings?.profitPayoutPercentage || 20;
      // Dividend pool calculation would use actual profit — simplified here
      const allUsers = await this.userRepo.find({ where: { deletedAt: null as any } });
      const totalQuotas = allUsers.reduce((s, u) => s + u.quotaBalance, 0);

      if (totalQuotas > 0) {
        // Use monthly revenue as proxy for dividend pool
        const monthRevenue = await this.earningRepo
          .createQueryBuilder('e')
          .select('SUM(e.amount)', 'total')
          .where('e.reference_month = :month', { month })
          .getRawOne();

        const pool = parseFloat(monthRevenue?.total || '0') * dividendPoolPercent / 100;
        if (pool > 0) {
          await this.bonusCalc.calculateDividends(month, pool);
          this.logger.log(`✅ Dividends distributed: R$${pool.toFixed(2)}`);
        }
      }

      // 4. Generate monthly earning summaries
      const allActiveUsers = await this.userRepo.find({ where: { deletedAt: null as any } });
      for (const user of allActiveUsers) {
        const earnings = await this.earningRepo.find({
          where: { userId: user.id, referenceMonth: month },
        });

        if (earnings.length === 0) continue;

        const fp = earnings.filter((e) => e.bonusType === BonusType.FIRST_PURCHASE).reduce((s, e) => s + Number(e.amount), 0);
        const rp = earnings.filter((e) => e.bonusType === BonusType.REPURCHASE).reduce((s, e) => s + Number(e.amount), 0);
        const tm = earnings.filter((e) => e.bonusType === BonusType.TEAM).reduce((s, e) => s + Number(e.amount), 0);
        const ld = earnings.filter((e) => e.bonusType === BonusType.LEADERSHIP).reduce((s, e) => s + Number(e.amount), 0);
        const dv = earnings.filter((e) => e.bonusType === BonusType.DIVIDEND).reduce((s, e) => s + Number(e.amount), 0);

        const total = fp + rp + tm + ld + dv;

        const existing = await this.summaryRepo.findOne({ where: { userId: user.id, month } });
        if (!existing) {
          const summary = this.summaryRepo.create({
            userId: user.id,
            month,
            firstPurchase: fp,
            repurchase: rp,
            team: tm,
            leadership: ld,
            dividend: dv,
            total,
            networkEarnings: fp + rp + tm + ld,
            quotaEarnings: dv,
          });
          await this.summaryRepo.save(summary);
        }
      }
      this.logger.log('✅ Monthly earning summaries generated');

      // 5. Lock month config
      let config = await this.configRepo.findOne({ where: { month } });
      if (config) {
        config.isLocked = true;
        await this.configRepo.save(config);
      }

      // 6. Recalculate all titles
      await this.titleCalc.recalculateAllTitles();

      this.logger.log(`🎉 Monthly close for ${month} completed successfully`);
    } catch (error) {
      this.logger.error(`❌ Monthly close failed: ${error.message}`, error.stack);
    }
  }
}
