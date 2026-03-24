import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonthlyCloseJob } from './monthly-close.job';
import { SplitCheckJob } from './split-check.job';
import { InactivityCheckJob } from './inactivity-check.job';
import { TrashPurgeJob } from './trash-purge.job';
import { TitleRecalculationJob } from './title-recalculation.job';
import { User } from '../modules/users/entities/user.entity';
import { Earning } from '../modules/earnings/entities/earning.entity';
import { MonthlyEarningSummary } from '../modules/earnings/entities/monthly-earning-summary.entity';
import { MonthlyFinancialConfig } from '../modules/admin/entities/monthly-financial-config.entity';
import { GlobalFinancialSettings } from '../modules/admin/entities/global-financial-settings.entity';
import { BonusModule } from '../core/bonus/bonus.module';
import { TitleModule } from '../core/title/title.module';
import { SplitModule } from '../core/split/split.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Earning,
      MonthlyEarningSummary,
      MonthlyFinancialConfig,
      GlobalFinancialSettings,
    ]),
    BonusModule,
    TitleModule,
    SplitModule,
  ],
  providers: [
    MonthlyCloseJob,
    SplitCheckJob,
    InactivityCheckJob,
    TrashPurgeJob,
    TitleRecalculationJob,
  ],
})
export class JobsModule {}
