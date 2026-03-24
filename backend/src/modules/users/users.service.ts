import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { User } from './entities/user.entity';
import { PartnerLevel } from '../../shared/interfaces/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id, deletedAt: IsNull() } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email, deletedAt: IsNull() } });
  }

  async findByReferralCode(code: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { referralCode: code, deletedAt: IsNull() } });
  }

  async getDirectReferrals(userId: string): Promise<User[]> {
    return this.userRepo.find({ where: { sponsorId: userId, deletedAt: IsNull() } });
  }

  async getUpline(userId: string, maxLevels = 6): Promise<User[]> {
    const upline: User[] = [];
    let currentId: string | null = userId;

    for (let i = 0; i < maxLevels; i++) {
      const user = await this.userRepo.findOne({ where: { id: currentId!, deletedAt: IsNull() } });
      if (!user || !user.sponsorId) break;

      const sponsor = await this.userRepo.findOne({ where: { id: user.sponsorId, deletedAt: IsNull() } });
      if (!sponsor) break;

      upline.push(sponsor);
      currentId = sponsor.id;
    }

    return upline;
  }

  isUserActive(user: User): boolean {
    if (!user.lastPurchaseDate) return false;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return user.lastPurchaseDate > sixMonthsAgo;
  }

  calculatePartnerLevel(purchasedQuotas: number): PartnerLevel {
    if (purchasedQuotas >= 60) return PartnerLevel.IMPERIAL;
    if (purchasedQuotas >= 20) return PartnerLevel.VIP;
    if (purchasedQuotas >= 10) return PartnerLevel.PLATINUM;
    return PartnerLevel.SOCIO;
  }

  async updatePartnerLevel(userId: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) return;

    const newLevel = this.calculatePartnerLevel(user.purchasedQuotas);
    if (newLevel !== user.partnerLevel) {
      await this.userRepo.update(userId, { partnerLevel: newLevel });
    }
  }

  async getAllActiveUsers(): Promise<User[]> {
    const users = await this.userRepo.find({ where: { deletedAt: IsNull() } });
    return users.filter((u) => this.isUserActive(u));
  }

  async getAllUsersWithQuotas(): Promise<User[]> {
    return this.userRepo.find({
      where: { quotaBalance: Not(0), deletedAt: IsNull() },
    });
  }

  async countActiveInNetwork(userId: string): Promise<number> {
    const directs = await this.getDirectReferrals(userId);
    return directs.filter((d) => this.isUserActive(d)).length;
  }

  async save(user: User): Promise<User> {
    return this.userRepo.save(user);
  }

  getRepository(): Repository<User> {
    return this.userRepo;
  }
}
