import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SplitEngineService } from '../core/split/split-engine.service';

@Injectable()
export class SplitCheckJob {
  private readonly logger = new Logger(SplitCheckJob.name);

  constructor(private readonly splitEngine: SplitEngineService) {}

  @Cron('0 0 * * *') // Daily at 00:00 UTC
  async handleSplitCheck() {
    this.logger.log('🔍 Applying pending price/split events...');
    try {
      await this.splitEngine.applyPendingEvent();
      this.logger.log('✅ Pending event check completed');
    } catch (error) {
      this.logger.error(`❌ Pending event check failed: ${error.message}`, error.stack);
    }
  }
}
