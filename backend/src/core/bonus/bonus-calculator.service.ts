import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { Earning } from '../../modules/earnings/entities/earning.entity';
import { TitleRequirement } from '../../modules/admin/entities/title-requirement.entity';
import { MonthlyFinancialConfig } from '../../modules/admin/entities/monthly-financial-config.entity';
import { BonusType, EarningStatus, UserTitle } from '../../shared/interfaces/enums';
import { getCurrentPeriod } from '../../shared/utils/helpers';

@Injectable()
export class BonusCalculatorService {
  private readonly logger = new Logger(BonusCalculatorService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Earning) private readonly earningRepo: Repository<Earning>,
    @InjectRepository(TitleRequirement) private readonly titleReqRepo: Repository<TitleRequirement>,
    @InjectRepository(MonthlyFinancialConfig) private readonly monthConfigRepo: Repository<MonthlyFinancialConfig>,
  ) {}

  private isActive(user: User): boolean {
    if (!user.lastPurchaseDate) return false;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return user.lastPurchaseDate > sixMonthsAgo;
  }

  private getCutoffDate(referenceMonth: string): Date {
    const [y, m] = referenceMonth.split('-').map(Number);
    return new Date(y, m - 1, 0); // Last day of previous month
  }

  private isCutoffEligible(purchaseDate: Date, referenceMonth: string): boolean {
    const cutoff = this.getCutoffDate(referenceMonth);
    return purchaseDate <= cutoff;
  }

  async calculateFirstPurchaseBonus(
    buyer: User,
    purchaseValue: number,
    purchaseDate: Date,
  ): Promise<void> {
    if (!buyer.sponsorId) return;

    const sponsor = await this.userRepo.findOne({ where: { id: buyer.sponsorId } });
    if (!sponsor) return;

    const month = getCurrentPeriod(purchaseDate);
    const bonusPercent = sponsor.quotaBalance > 0 ? 10 : 5;
    const amount = purchaseValue * (bonusPercent / 100);

    const earning = this.earningRepo.create({
      userId: sponsor.id,
      bonusType: BonusType.FIRST_PURCHASE,
      amount,
      sourceUserId: buyer.id,
      sourceUserName: buyer.name,
      description: `Bônus de primeira compra de ${buyer.name}`,
      level: 1,
      referenceMonth: month,
      cutoffEligible: this.isCutoffEligible(purchaseDate, month),
    });

    await this.earningRepo.save(earning);

    // Update sponsor total_earnings
    await this.userRepo.increment({ id: sponsor.id }, 'totalEarnings', amount);

    this.logger.log(`💰 First purchase bonus: R$${amount} → ${sponsor.name}`);
  }

  async calculateRepurchaseBonus(
    buyer: User,
    purchaseValue: number,
    purchaseDate: Date,
  ): Promise<void> {
    const month = getCurrentPeriod(purchaseDate);
    let currentUser = buyer;

    for (let level = 1; level <= 6; level++) {
      if (!currentUser.sponsorId) break;

      const uplineUser = await this.userRepo.findOne({ where: { id: currentUser.sponsorId } });
      if (!uplineUser) break;

      // Only active users receive repurchase bonus
      if (!this.isActive(uplineUser)) {
        currentUser = uplineUser;
        continue;
      }

      // Check title unlocks sufficient levels
      const titleReq = await this.titleReqRepo.findOne({ where: { title: uplineUser.title } });
      if (!titleReq || titleReq.repurchaseLevels < level) {
        currentUser = uplineUser;
        continue;
      }

      const percent = level === 1 ? 5 : 2;
      const amount = purchaseValue * (percent / 100);

      const earning = this.earningRepo.create({
        userId: uplineUser.id,
        bonusType: BonusType.REPURCHASE,
        amount,
        sourceUserId: buyer.id,
        sourceUserName: buyer.name,
        description: `Bônus de recompra nível ${level} de ${buyer.name}`,
        level,
        referenceMonth: month,
        cutoffEligible: this.isCutoffEligible(purchaseDate, month),
      });

      await this.earningRepo.save(earning);
      await this.userRepo.increment({ id: uplineUser.id }, 'totalEarnings', amount);

      currentUser = uplineUser;
    }
  }

  async calculateTeamBonus(referenceMonth: string): Promise<void> {
    this.logger.log(`📊 Calculating team bonuses for ${referenceMonth}`);

    const allUsers = await this.userRepo.find({ where: { deletedAt: null as unknown as Date } });
    const activeUsers = allUsers.filter((u) => this.isActive(u));

    for (const user of activeUsers) {
      const titleReq = await this.titleReqRepo.findOne({ where: { title: user.title } });
      if (!titleReq || titleReq.teamLevels === 0) continue;

      // Sum earnings of all downline within N levels
      const downlineEarnings = await this.getDownlineEarnings(
        user.id,
        titleReq.teamLevels,
        referenceMonth,
      );

      if (downlineEarnings <= 0) continue;

      const amount = downlineEarnings * 0.02;

      const earning = this.earningRepo.create({
        userId: user.id,
        bonusType: BonusType.TEAM,
        amount,
        description: `Bônus de equipe (${titleReq.teamLevels} níveis)`,
        level: 0,
        referenceMonth,
        cutoffEligible: true,
      });

      await this.earningRepo.save(earning);
      await this.userRepo.increment({ id: user.id }, 'totalEarnings', amount);
    }
  }

  async calculateLeadershipBonus(referenceMonth: string): Promise<void> {
    this.logger.log(`👑 Calculating leadership bonuses for ${referenceMonth}`);

    const allUsers = await this.userRepo.find({ where: { deletedAt: null as unknown as Date } });
    const qualifiedUsers = allUsers.filter(
      (u) =>
        this.isActive(u) &&
        (u.title === UserTitle.GOLD || u.title === UserTitle.DIAMOND),
    );

    for (const user of qualifiedUsers) {
      const percent = user.title === UserTitle.DIAMOND ? 2 : 1;

      // Sum earnings of qualified users (gold/diamond) in downline up to 5 levels
      const qualifiedDownlineEarnings = await this.getQualifiedDownlineEarnings(
        user.id,
        5,
        referenceMonth,
      );

      if (qualifiedDownlineEarnings <= 0) continue;

      const amount = qualifiedDownlineEarnings * (percent / 100);

      const earning = this.earningRepo.create({
        userId: user.id,
        bonusType: BonusType.LEADERSHIP,
        amount,
        description: `Bônus de liderança (${user.title})`,
        level: 0,
        referenceMonth,
        cutoffEligible: true,
      });

      await this.earningRepo.save(earning);
      await this.userRepo.increment({ id: user.id }, 'totalEarnings', amount);
    }
  }

  async calculateDividends(
    referenceMonth: string,
    dividendPool: number,
  ): Promise<void> {
    this.logger.log(`💎 Calculating dividends for ${referenceMonth} — pool: R$${dividendPool}`);

    const usersWithQuotas = await this.userRepo.find({
      where: { deletedAt: null as unknown as Date },
    });

    const totalQuotas = usersWithQuotas.reduce((sum, u) => sum + u.quotaBalance, 0);
    if (totalQuotas === 0) return;

    for (const user of usersWithQuotas) {
      if (user.quotaBalance <= 0) continue;

      const amount = (dividendPool / totalQuotas) * user.quotaBalance;

      const earning = this.earningRepo.create({
        userId: user.id,
        bonusType: BonusType.DIVIDEND,
        amount,
        description: `Dividendos (${user.quotaBalance} cotas)`,
        level: 0,
        referenceMonth,
        cutoffEligible: true,
      });

      await this.earningRepo.save(earning);
      await this.userRepo.increment({ id: user.id }, 'totalEarnings', amount);
    }
  }

  private async getDownlineEarnings(
    userId: string,
    maxLevels: number,
    referenceMonth: string,
  ): Promise<number> {
    let total = 0;
    let currentLevelIds = [userId];

    for (let level = 1; level <= maxLevels; level++) {
      if (currentLevelIds.length === 0) break;

      const downline = await this.userRepo.find({
        where: currentLevelIds.map((id) => ({ sponsorId: id })),
      });

      if (downline.length === 0) break;

      const ids = downline.map((u) => u.id);

      const earnings = await this.earningRepo
        .createQueryBuilder('e')
        .select('SUM(e.amount)', 'total')
        .where('e.user_id IN (:...ids)', { ids })
        .andWhere('e.reference_month = :month', { month: referenceMonth })
        .andWhere('e.bonus_type IN (:...types)', {
          types: [BonusType.FIRST_PURCHASE, BonusType.REPURCHASE],
        })
        .getRawOne();

      total += parseFloat(earnings?.total || '0');
      currentLevelIds = ids;
    }

    return total;
  }

  private async getQualifiedDownlineEarnings(
    userId: string,
    maxLevels: number,
    referenceMonth: string,
  ): Promise<number> {
    let total = 0;
    let currentLevelIds = [userId];

    for (let level = 1; level <= maxLevels; level++) {
      if (currentLevelIds.length === 0) break;

      const downline = await this.userRepo.find({
        where: currentLevelIds.map((id) => ({ sponsorId: id })),
      });

      if (downline.length === 0) break;

      const qualifiedDownline = downline.filter(
        (u) => u.title === UserTitle.GOLD || u.title === UserTitle.DIAMOND,
      );

      if (qualifiedDownline.length > 0) {
        const ids = qualifiedDownline.map((u) => u.id);

        const earnings = await this.earningRepo
          .createQueryBuilder('e')
          .select('SUM(e.amount)', 'total')
          .where('e.user_id IN (:...ids)', { ids })
          .andWhere('e.reference_month = :month', { month: referenceMonth })
          .getRawOne();

        total += parseFloat(earnings?.total || '0');
      }

      currentLevelIds = downline.map((u) => u.id);
    }

    return total;
  }
}
