import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SplitEngineService } from '../core/split/split-engine.service';

@Injectable()
export class SplitCheckJob {
  private readonly logger = new Logger(SplitCheckJob.name);

  constructor(private readonly splitEngine: SplitEngineService) {}

  @Cron('0 0 * * *') // Daily at 00:00 UTC
  async handleSplitCheck() {
    this.logger.log('🔍 Checking split/price conditions...');
    try {
      await this.splitEngine.checkAndProcess();
      this.logger.log('✅ Split/price check completed');
    } catch (error) {
      this.logger.error(`❌ Split check failed: ${error.message}`, error.stack);
    }
  }
}
