import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayoutsService } from './payouts.service';
import { PayoutsController } from './payouts.controller';
import { PayoutRequest } from './entities/payout-request.entity';
import { MonthlyPayoutSummary } from './entities/monthly-payout-summary.entity';
import { AdminPaymentCheck } from '../admin/entities/admin-payment-check.entity';
import { User } from '../users/entities/user.entity';
import { Earning } from '../earnings/entities/earning.entity';
import { GlobalFinancialSettings } from '../admin/entities/global-financial-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PayoutRequest,
      MonthlyPayoutSummary,
      AdminPaymentCheck,
      User,
      Earning,
      GlobalFinancialSettings,
    ]),
  ],
  controllers: [PayoutsController],
  providers: [PayoutsService],
  exports: [PayoutsService],
})
export class PayoutsModule {}
