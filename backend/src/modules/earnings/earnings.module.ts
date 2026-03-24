import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EarningsService } from './earnings.service';
import { EarningsController } from './earnings.controller';
import { Earning } from './entities/earning.entity';
import { MonthlyEarningSummary } from './entities/monthly-earning-summary.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Earning, MonthlyEarningSummary])],
  controllers: [EarningsController],
  providers: [EarningsService],
  exports: [EarningsService],
})
export class EarningsModule {}
