import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MonthlyFinancialConfig } from '../modules/admin/entities/monthly-financial-config.entity';
import { TitleCalculatorService } from '../core/title/title-calculator.service';
import { SnapshotService } from '../core/snapshot/snapshot.service';

/**
 * Fechamento mensal — roda no dia 1 às 00:00 UTC.
 *
 * IMPORTANTE: este job NÃO calcula dividendos, equipe ou liderança. Esses
 * bônus dependem do lucro líquido informado pelo admin e só são calculados na
 * geração do lote (`AdminService.generateBatch`). O job mensal apenas:
 *   1. Trava a configuração financeira do mês de referência.
 *   2. Recalcula os títulos de todos os usuários.
 *   3. Captura o snapshot imutável do mês (título, cotas, status, níveis).
 *
 * O snapshot é capturado APÓS o recálculo de títulos, para congelar o título
 * correto de fim de mês. É ele que o cálculo de pagamentos deve consultar.
 */
@Injectable()
export class MonthlyCloseJob {
  private readonly logger = new Logger(MonthlyCloseJob.name);

  constructor(
    @InjectRepository(MonthlyFinancialConfig) private readonly configRepo: Repository<MonthlyFinancialConfig>,
    private readonly titleCalc: TitleCalculatorService,
    private readonly snapshot: SnapshotService,
  ) {}

  @Cron('0 0 1 * *') // Day 1 at 00:00 UTC
  async handleMonthlyClose() {
    this.logger.log('🔄 Starting monthly close...');
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

    try {
      // 1. Trava a configuração financeira do mês de referência (se existir).
      const config = await this.configRepo.findOne({ where: { month } });
      if (config) {
        config.isLocked = true;
        await this.configRepo.save(config);
        this.logger.log(`🔒 Month config locked for ${month}`);
      }

      // 2. Recalcula os títulos de todos os usuários.
      await this.titleCalc.recalculateAllTitles();

      // 3. Captura o snapshot imutável do mês (após os títulos estarem corretos).
      const result = await this.snapshot.captureMonth(month);
      this.logger.log(
        result.skipped
          ? `📸 Snapshot de ${month} já existia — mantido`
          : `📸 Snapshot de ${month}: ${result.created} usuário(s)`,
      );

      this.logger.log(`🎉 Monthly close for ${month} completed successfully`);
    } catch (error) {
      this.logger.error(`❌ Monthly close failed: ${error.message}`, error.stack);
    }
  }
}
