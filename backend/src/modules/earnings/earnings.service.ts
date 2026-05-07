import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Earning } from './entities/earning.entity';
import { MonthlyEarningSummary } from './entities/monthly-earning-summary.entity';
import { QuotaTransaction } from '../quotas/entities/quota-transaction.entity';
import { User } from '../users/entities/user.entity';
import { PayoutRequest } from '../payouts/entities/payout-request.entity';
import { BonusType, TransactionType, TransactionStatus, PayoutStatus } from '../../shared/interfaces/enums';
import { getCurrentPeriod } from '../../shared/utils/helpers';

/**
 * Linha unificada do histórico exibida ao usuário.
 *
 * `level`:
 *   0     → movimentação do próprio usuário (compra/ganho).
 *   1..6  → compra realizada por um membro da rede no nível indicado.
 */
export interface EarningHistoryRow {
  id: string;
  source: 'earning' | 'purchase';
  bonusType: BonusType | 'purchase';
  amount: number;
  description: string;
  level: number;
  referenceMonth: string;
  status: string;
  cutoffEligible: boolean;
  createdAt: Date;
  sourceUserName: string | null;
}

@Injectable()
export class EarningsService {
  constructor(
    @InjectRepository(Earning) private readonly earningRepo: Repository<Earning>,
    @InjectRepository(MonthlyEarningSummary) private readonly summaryRepo: Repository<MonthlyEarningSummary>,
    @InjectRepository(QuotaTransaction) private readonly txnRepo: Repository<QuotaTransaction>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(PayoutRequest) private readonly payoutRepo: Repository<PayoutRequest>,
  ) {}

  /**
   * Devolve o histórico unificado do usuário:
   *   • próprios ganhos (earnings) — sempre level 0, exceto FIRST_PURCHASE/REPURCHASE
   *     que já vêm com `level` corresp.
   *   • próprias compras (quota_transactions PURCHASE) — level 0
   *   • compras dos downlines até 6 níveis — level 1..6
   *
   * Filtros opcionais:
   *   • month  → restringe ao mês YYYY-MM (referenceMonth)
   *   • level  → 0 (somente próprio), 1..6 (somente aquele nível da rede)
   */
  async getEarnings(
    userId: string,
    page = 1,
    pageSize = 20,
    month?: string,
    level?: number,
  ) {
    // Tipos calculados durante o batch (Etapa 2 do admin). Para estes
    // a refer\u00eancia temporal exibida ao usu\u00e1rio passa a ser `processed_at`
    // (quando o admin gerou o lote), n\u00e3o `reference_month`.
    const POST_BATCH_TYPES = new Set<BonusType>([
      BonusType.DIVIDEND,
      BonusType.TEAM,
      BonusType.LEADERSHIP,
    ]);

    // \u2500\u2500 1) Earnings do pr\u00f3prio usu\u00e1rio (sem filtro de m\u00eas no banco \u2014\n    // a filtragem ser\u00e1 feita em c\u00f3digo, pois cada tipo usa um campo\n    // diferente como refer\u00eancia temporal).
    const ownEarningsRows = await this.earningRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const earningRows: EarningHistoryRow[] = ownEarningsRows
      // P\u00f3s-batch: s\u00f3 aparecem ap\u00f3s o admin processar.
      .filter((e) => !POST_BATCH_TYPES.has(e.bonusType) || e.processedAt !== null)
      // Filtro por m\u00eas \u2014 cada tipo na sua refer\u00eancia.
      .filter((e) => {
        if (!month) return true;
        if (POST_BATCH_TYPES.has(e.bonusType)) {
          if (!e.processedAt) return false;
          const d = new Date(e.processedAt);
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return ym === month;
        }
        return e.referenceMonth === month;
      })
      .map((e) => {
        // Para tipos p\u00f3s-batch a "data" exibida \u00e9 a do processamento.
        const displayDate = POST_BATCH_TYPES.has(e.bonusType) && e.processedAt
          ? new Date(e.processedAt)
          : e.createdAt;
        return {
          id: `e-${e.id}`,
          source: 'earning' as const,
          bonusType: e.bonusType,
          amount: Number(e.amount),
          description: e.description,
          level: e.level || 0,
          referenceMonth: e.referenceMonth,
          status: String(e.status),
          cutoffEligible: e.cutoffEligible,
          createdAt: displayDate,
          sourceUserName: e.sourceUserName,
        };
      });

    // ── 2) Compras do próprio usuário (level 0) ──
    const ownPurchases = await this.txnRepo.find({
      where: {
        userId,
        type: TransactionType.PURCHASE,
        status: TransactionStatus.COMPLETED,
        ...(month ? { referenceMonth: month } : {}),
      },
      order: { createdAt: 'DESC' },
    });

    const purchaseRows: EarningHistoryRow[] = ownPurchases.map((t) => ({
      id: `t-${t.id}`,
      source: 'purchase',
      bonusType: 'purchase',
      // Compra é uma saída → exibimos como valor negativo na UI.
      amount: -Math.abs(Number(t.amount)),
      description: t.description || `Compra de ${t.quotasAffected} cota(s)`,
      level: 0,
      referenceMonth: t.referenceMonth,
      status: String(t.status),
      cutoffEligible: true,
      createdAt: t.createdAt,
      sourceUserName: null,
    }));

    // ── 3) Compras dos downlines (até 6 níveis) ──
    let downlineRows: EarningHistoryRow[] = [];
    const downlineByLevel = await this.getDownlineIdsByLevel(userId, 6);
    for (let lvl = 1; lvl <= 6; lvl++) {
      const ids = downlineByLevel[lvl];
      if (!ids || ids.length === 0) continue;

      const purchases = await this.txnRepo.find({
        where: {
          userId: In(ids),
          type: TransactionType.PURCHASE,
          status: TransactionStatus.COMPLETED,
          ...(month ? { referenceMonth: month } : {}),
        },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });

      for (const t of purchases) {
        downlineRows.push({
          id: `n-${t.id}`,
          source: 'purchase',
          bonusType: 'purchase',
          amount: Number(t.amount),
          description: `Compra na rede (nível ${lvl}): ${(t.user as any)?.name ?? '—'} — ${t.quotasAffected} cota(s)`,
          level: lvl,
          referenceMonth: t.referenceMonth,
          status: String(t.status),
          cutoffEligible: true,
          createdAt: t.createdAt,
          sourceUserName: (t.user as any)?.name ?? null,
        });
      }
    }

    // ── 4) Filtro por nível ──
    const all = [...earningRows, ...purchaseRows, ...downlineRows];
    const filtered = (level === undefined || level === null || (level as any) === '')
      ? all
      : all.filter((r) => r.level === Number(level));

    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  /**
   * Devolve um mapa { 1: [...userIds], 2: [...], ... } com os ids dos
   * descendentes do usuário em cada nível até `maxLevels`.
   */
  private async getDownlineIdsByLevel(rootUserId: string, maxLevels: number): Promise<Record<number, string[]>> {
    const result: Record<number, string[]> = {};
    let currentLevelIds = [rootUserId];

    for (let lvl = 1; lvl <= maxLevels; lvl++) {
      if (currentLevelIds.length === 0) break;

      const downline = await this.userRepo.find({
        where: currentLevelIds.map((id) => ({ sponsorId: id })),
        select: ['id'],
      });

      if (downline.length === 0) break;
      const ids = downline.map((u) => u.id);
      result[lvl] = ids;
      currentLevelIds = ids;
    }

    return result;
  }

  async getOverview(userId: string) {
    const currentMonth = getCurrentPeriod();
    const lastMonth = this.getPreviousMonth(currentMonth);

    // Lifetime ("Ganhos da vida") = soma dos pagamentos COMPLETADOS.
    // J\u00e1 inclui dividendos + ganhos de rede + breakdown completo,
    // pois cada payout cont\u00e9m amount = quotaAmount + networkAmount.
    const totalEarnedRow = await this.payoutRepo
      .createQueryBuilder('p')
      .select('SUM(p.amount)', 'total')
      .where('p.user_id = :userId', { userId })
      .andWhere('p.status = :status', { status: PayoutStatus.COMPLETED })
      .getRawOne();

    const pendingEarnings = await this.earningRepo
      .createQueryBuilder('e')
      .select('SUM(e.amount)', 'total')
      .where('e.user_id = :userId', { userId })
      .andWhere('e.status = :status', { status: 'pending' })
      .getRawOne();

    const thisMonthEarnings = await this.earningRepo
      .createQueryBuilder('e')
      .select('SUM(e.amount)', 'total')
      .where('e.user_id = :userId', { userId })
      .andWhere('e.reference_month = :month', { month: currentMonth })
      .getRawOne();

    const lastMonthEarnings = await this.earningRepo
      .createQueryBuilder('e')
      .select('SUM(e.amount)', 'total')
      .where('e.user_id = :userId', { userId })
      .andWhere('e.reference_month = :month', { month: lastMonth })
      .getRawOne();

    // Calculate average monthly
    const summaryCount = await this.summaryRepo.count({ where: { userId } });
    const allTotal = parseFloat(totalEarnedRow?.total || '0');

    return {
      userId,
      totalEarned: allTotal,
      pendingEarnings: parseFloat(pendingEarnings?.total || '0'),
      thisMonthEarnings: parseFloat(thisMonthEarnings?.total || '0'),
      lastMonthEarnings: parseFloat(lastMonthEarnings?.total || '0'),
      averageMonthly: summaryCount > 0 ? allTotal / summaryCount : 0,
      lossProjection: 0, // Calculated in monthly close
    };
  }

  async getMonthlySummary(userId: string, month: string) {
    let summary = await this.summaryRepo.findOne({
      where: { userId, month },
    });

    if (!summary) {
      // Calculate on the fly
      summary = await this.buildMonthlySummary(userId, month);
    }

    return summary;
  }

  async getByType(userId: string, bonusType: BonusType) {
    return this.earningRepo.find({
      where: { userId, bonusType },
      order: { createdAt: 'DESC' },
    });
  }

  async buildMonthlySummary(userId: string, month: string): Promise<MonthlyEarningSummary> {
    const earnings = await this.earningRepo.find({
      where: { userId, referenceMonth: month },
    });

    const fp = earnings.filter((e) => e.bonusType === BonusType.FIRST_PURCHASE).reduce((s, e) => s + Number(e.amount), 0);
    const rp = earnings.filter((e) => e.bonusType === BonusType.REPURCHASE).reduce((s, e) => s + Number(e.amount), 0);
    const tm = earnings.filter((e) => e.bonusType === BonusType.TEAM).reduce((s, e) => s + Number(e.amount), 0);
    const ld = earnings.filter((e) => e.bonusType === BonusType.LEADERSHIP).reduce((s, e) => s + Number(e.amount), 0);
    const dv = earnings.filter((e) => e.bonusType === BonusType.DIVIDEND).reduce((s, e) => s + Number(e.amount), 0);

    const networkEarnings = fp + rp + tm + ld;
    const total = networkEarnings + dv;

    const [y, m] = month.split('-').map(Number);
    const cutoffDate = new Date(y, m - 1, 0).toISOString().slice(0, 10);

    return {
      userId,
      month,
      firstPurchase: fp,
      repurchase: rp,
      team: tm,
      leadership: ld,
      dividend: dv,
      total,
      networkEarnings,
      quotaEarnings: dv,
      lossProjection: 0,
      cutoffDate,
    } as MonthlyEarningSummary;
  }

  private getPreviousMonth(month: string): string {
    const [y, m] = month.split('-').map(Number);
    const date = new Date(y, m - 2, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}
