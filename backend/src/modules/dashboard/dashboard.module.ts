import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { User } from '../users/entities/user.entity';
import { QuotaSystemState } from '../quotas/entities/quota-system-state.entity';
import { Earning } from '../earnings/entities/earning.entity';
import { QuotaTransaction } from '../quotas/entities/quota-transaction.entity';
import { GlobalFinancialSettings } from '../admin/entities/global-financial-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, QuotaSystemState, Earning, QuotaTransaction, GlobalFinancialSettings]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
