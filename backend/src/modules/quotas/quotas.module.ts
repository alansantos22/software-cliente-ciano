import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotasService } from './quotas.service';
import { QuotasController, CheckoutController, PaymentsWebhookController } from './quotas.controller';
import { QuotaTransaction } from './entities/quota-transaction.entity';
import { QuotaSystemState } from './entities/quota-system-state.entity';
import { SplitEvent } from './entities/split-event.entity';
import { User } from '../users/entities/user.entity';
import { GlobalFinancialSettings } from '../admin/entities/global-financial-settings.entity';
import { PartnerLevelRequirement } from '../admin/entities/partner-level-requirement.entity';
import { BonusModule } from '../../core/bonus/bonus.module';
import { SplitModule } from '../../core/split/split.module';
import { TitleModule } from '../../core/title/title.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuotaTransaction,
      QuotaSystemState,
      SplitEvent,
      User,
      GlobalFinancialSettings,
      PartnerLevelRequirement,
    ]),
    BonusModule,
    SplitModule,
    TitleModule,
    PaymentsModule,
  ],
  controllers: [QuotasController, CheckoutController, PaymentsWebhookController],
  providers: [QuotasService],
  exports: [QuotasService],
})
export class QuotasModule {}
