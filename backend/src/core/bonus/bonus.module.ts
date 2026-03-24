import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BonusCalculatorService } from './bonus-calculator.service';
import { User } from '../../modules/users/entities/user.entity';
import { Earning } from '../../modules/earnings/entities/earning.entity';
import { TitleRequirement } from '../../modules/admin/entities/title-requirement.entity';
import { MonthlyFinancialConfig } from '../../modules/admin/entities/monthly-financial-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Earning, TitleRequirement, MonthlyFinancialConfig]),
  ],
  providers: [BonusCalculatorService],
  exports: [BonusCalculatorService],
})
export class BonusModule {}
