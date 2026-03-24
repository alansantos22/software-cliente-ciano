import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';

@Injectable()
export class InactivityCheckJob {
  private readonly logger = new Logger(InactivityCheckJob.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  @Cron('0 1 * * *') // Daily at 01:00 UTC
  async handleInactivityCheck() {
    this.logger.log('🔍 Checking user inactivity...');
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const inactiveUsers = await this.userRepo.find({
        where: {
          lastPurchaseDate: LessThan(sixMonthsAgo),
          isActive: true,
          deletedAt: null as any,
        },
      });

      for (const user of inactiveUsers) {
        user.isActive = false;
        await this.userRepo.save(user);
      }

      if (inactiveUsers.length > 0) {
        this.logger.log(`⚠️ ${inactiveUsers.length} user(s) marked as inactive`);
      } else {
        this.logger.log('✅ No inactive users found');
      }
    } catch (error) {
      this.logger.error(`❌ Inactivity check failed: ${error.message}`, error.stack);
    }
  }
}
