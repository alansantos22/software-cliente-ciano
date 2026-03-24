import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not, IsNull } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';

@Injectable()
export class TrashPurgeJob {
  private readonly logger = new Logger(TrashPurgeJob.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  @Cron('0 2 * * *') // Daily at 02:00 UTC
  async handleTrashPurge() {
    this.logger.log('🗑️ Checking trash for expired items...');
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const expiredUsers = await this.userRepo.find({
        where: {
          deletedAt: LessThan(thirtyDaysAgo),
        },
        withDeleted: true,
      });

      for (const user of expiredUsers) {
        await this.userRepo.remove(user);
      }

      if (expiredUsers.length > 0) {
        this.logger.log(`🗑️ ${expiredUsers.length} user(s) permanently deleted from trash`);
      } else {
        this.logger.log('✅ Trash is clean');
      }
    } catch (error) {
      this.logger.error(`❌ Trash purge failed: ${error.message}`, error.stack);
    }
  }
}
