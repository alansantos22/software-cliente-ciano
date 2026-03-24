import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TitleCalculatorService } from '../core/title/title-calculator.service';

@Injectable()
export class TitleRecalculationJob {
  private readonly logger = new Logger(TitleRecalculationJob.name);

  constructor(private readonly titleCalc: TitleCalculatorService) {}

  @Cron('0 3 * * *') // Daily at 03:00 UTC
  async handleTitleRecalculation() {
    this.logger.log('🏅 Recalculating all user titles...');
    try {
      await this.titleCalc.recalculateAllTitles();
      this.logger.log('✅ Title recalculation completed');
    } catch (error) {
      this.logger.error(`❌ Title recalculation failed: ${error.message}`, error.stack);
    }
  }
}
