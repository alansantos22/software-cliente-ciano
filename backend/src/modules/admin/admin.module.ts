import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminManagerService } from './admin-manager.service';
import { AdminManagerController } from './admin-manager.controller';
import { User } from '../users/entities/user.entity';
import { QuotaTransaction } from '../quotas/entities/quota-transaction.entity';
import { QuotaSystemState } from '../quotas/entities/quota-system-state.entity';
import { Earning } from '../earnings/entities/earning.entity';
import { PayoutRequest } from '../payouts/entities/payout-request.entity';
import { MonthlyFinancialConfig } from './entities/monthly-financial-config.entity';
import { GlobalFinancialSettings } from './entities/global-financial-settings.entity';
import { TitleRequirement } from './entities/title-requirement.entity';
import { AdminPaymentCheck } from './entities/admin-payment-check.entity';
import { PartnerLevelRequirement } from './entities/partner-level-requirement.entity';
import { SplitModule } from '../../core/split/split.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      QuotaTransaction,
      QuotaSystemState,
      Earning,
      PayoutRequest,
      MonthlyFinancialConfig,
      GlobalFinancialSettings,
      TitleRequirement,
      AdminPaymentCheck,
      PartnerLevelRequirement,
    ]),
    SplitModule,
  ],
  controllers: [AdminController, AdminManagerController],
  providers: [AdminService, AdminManagerService],
  exports: [AdminService],
})
export class AdminModule {}
