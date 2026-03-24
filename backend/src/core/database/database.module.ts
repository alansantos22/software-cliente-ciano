import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { User } from '../../modules/users/entities/user.entity';
import { GlobalFinancialSettings } from '../../modules/admin/entities/global-financial-settings.entity';
import { QuotaSystemState } from '../../modules/quotas/entities/quota-system-state.entity';
import { TitleRequirement } from '../../modules/admin/entities/title-requirement.entity';
import { PartnerLevelRequirement } from '../../modules/admin/entities/partner-level-requirement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      GlobalFinancialSettings,
      QuotaSystemState,
      TitleRequirement,
      PartnerLevelRequirement,
    ]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class DatabaseModule {}
