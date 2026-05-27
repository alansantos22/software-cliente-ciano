import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, MoreThan, In } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { QuotaTransaction } from '../quotas/entities/quota-transaction.entity';
import { QuotaSystemState } from '../quotas/entities/quota-system-state.entity';
import { Earning } from '../earnings/entities/earning.entity';
import { PayoutRequest } from '../payouts/entities/payout-request.entity';
import { MonthlyFinancialConfig } from './entities/monthly-financial-config.entity';
import { GlobalFinancialSettings } from './entities/global-financial-settings.entity';
import { TitleRequirement } from './entities/title-requirement.entity';
import { SplitEngineService } from '../../core/split/split-engine.service';
import { BonusCalculatorService } from '../../core/bonus/bonus-calculator.service';
import { SnapshotService } from '../../core/snapshot/snapshot.service';
import { BonusType, EarningStatus, PayoutStatus, TransactionType, TransactionStatus } from '../../shared/interfaces/enums';
import { getCurrentPeriod } from '../../shared/utils/helpers';

/**
 * Calcula as datas de pagamento (YYYY-MM) de um mês de competência:
 *   • bônus de rede → ref+1 (mês seguinte)
 *   • dividendos    → ref+2 (dois meses depois)
 */
function computePaymentMonths(profitMonth: string): {
  bonusPaymentMonth: string;
  dividendPaymentMonth: string;
} {
  const [y, m] = profitMonth.split('-').map(Number);
  const bonusDate = new Date(y!, m! - 1 + 1, 1);    // m é 1-12, JS é 0-11; ref+1
  const divDate   = new Date(y!, m! - 1 + 2, 1);    // ref+2
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return {
    bonusPaymentMonth: fmt(bonusDate),
    dividendPaymentMonth: fmt(divDate),
  };
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(QuotaTransaction) private readonly txnRepo: Repository<QuotaTransaction>,
    @InjectRepository(QuotaSystemState) private readonly stateRepo: Repository<QuotaSystemState>,
    @InjectRepository(Earning) private readonly earningRepo: Repository<Earning>,
    @InjectRepository(PayoutRequest) private readonly payoutRepo: Repository<PayoutRequest>,
    @InjectRepository(MonthlyFinancialConfig) private readonly monthlyConfigRepo: Repository<MonthlyFinancialConfig>,
    @InjectRepository(GlobalFinancialSettings) private readonly settingsRepo: Repository<GlobalFinancialSettings>,
    @InjectRepository(TitleRequirement) private readonly titleReqRepo: Repository<TitleRequirement>,
    private readonly splitEngine: SplitEngineService,
    private readonly bonusCalc: BonusCalculatorService,
    private readonly snapshotService: SnapshotService,
  ) {}

  // ─── Dashboard ─────────────────────────────────────────

  async getDashboardKpis() {
    const month = getCurrentPeriod();
    const now = new Date();
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const activeUsers = await this.userRepo.count({
      where: { lastPurchaseDate: MoreThan(sixMonthsAgo), deletedAt: IsNull() },
    });

    const totalUsersCount = await this.userRepo.count({ where: { deletedAt: IsNull() } });

    const monthRevenueRow = await this.txnRepo
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where('t.type = :type', { type: TransactionType.PURCHASE })
      .andWhere('t.reference_month = :month', { month })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();

    const prevMonthRevenueRow = await this.txnRepo
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where('t.type = :type', { type: TransactionType.PURCHASE })
      .andWhere('t.reference_month = :month', { month: prevMonth })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();

    const totalRevenueRow = await this.txnRepo
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where('t.type = :type', { type: TransactionType.PURCHASE })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();

    const monthQuotasRow = await this.txnRepo
      .createQueryBuilder('t')
      .select('SUM(t.quotas_affected)', 'total')
      .where('t.type = :type', { type: TransactionType.PURCHASE })
      .andWhere('t.reference_month = :month', { month })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();

    const prevMonthQuotasRow = await this.txnRepo
      .createQueryBuilder('t')
      .select('SUM(t.quotas_affected)', 'total')
      .where('t.type = :type', { type: TransactionType.PURCHASE })
      .andWhere('t.reference_month = :month', { month: prevMonth })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();

    const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    const dividendPoolPercent = settings?.profitPayoutPercentage || 20;

    const monthRev = parseFloat(monthRevenueRow?.total || '0');
    const prevMonthRev = parseFloat(prevMonthRevenueRow?.total || '0');
    const totalRev = parseFloat(totalRevenueRow?.total || '0');
    const monthQ = parseInt(monthQuotasRow?.total || '0', 10);
    const prevMonthQ = parseInt(prevMonthQuotasRow?.total || '0', 10);

    const calcTrend = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const pendingPayoutsCount = await this.payoutRepo.count({ where: { status: PayoutStatus.PENDING } });
    const pendingPayoutsTotalRow = await this.payoutRepo
      .createQueryBuilder('p')
      .select('SUM(p.amount)', 'total')
      .where('p.status = :status', { status: PayoutStatus.PENDING })
      .getRawOne();

    // ── Caixa de Dividendos (Tarefa G) ──
    // O cliente pediu que a Caixa de Dividendos passe a refletir APENAS o
    // que está lançado em payout_requests para o mês corrente. Não usar mais
    // a estimativa baseada na receita das compras.
    const dividendPoolRow = await this.payoutRepo
      .createQueryBuilder('p')
      .select('SUM(p.amount)', 'total')
      .where('p.payment_month = :month', { month })
      .getRawOne();
    const dividendPool = parseFloat(dividendPoolRow?.total || '0');
    const dividendPoolNote = dividendPool > 0
      ? `Total comprometido para pagamento em ${month}`
      : 'Aguardando lançamento do lucro do mês';

    // Mês de pagamento do batch pendente mais antigo (para o alerta de atraso)
    const oldestPendingRow = await this.payoutRepo
      .createQueryBuilder('p')
      .select('MIN(p.payment_month)', 'pm')
      .where('p.status IN (:...statuses)', {
        statuses: [PayoutStatus.PENDING, PayoutStatus.PROCESSING],
      })
      .getRawOne();
    const pendingPaymentMonth: string | null = oldestPendingRow?.pm || null;

    return {
      monthRevenue: monthRev,
      monthRevenueTrend: calcTrend(monthRev, prevMonthRev),
      activeUsers,
      retentionRate: totalUsersCount > 0 ? Math.round((activeUsers / totalUsersCount) * 100) : 0,
      monthQuotas: monthQ,
      monthQuotasTrend: calcTrend(monthQ, prevMonthQ),
      totalRevenue: totalRev,
      dividendPool,
      dividendPoolPercent,
      dividendPoolNote,
      pendingPaymentMonth,
      pendingPayoutsCount,
      pendingPayoutsTotal: parseFloat(pendingPayoutsTotalRow?.total || '0'),
    };
  }

  async getSalesChart() {
    const PT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const entries: Array<{ key: string; label: string }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      entries.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: PT_MONTHS[d.getMonth()],
      });
    }

    const result = [];
    for (const { key, label } of entries) {
      const novasRow = await this.txnRepo
        .createQueryBuilder('t')
        .select('SUM(t.quotas_affected)', 'total')
        .where('t.type = :type', { type: TransactionType.PURCHASE })
        .andWhere('t.reference_month = :month', { month: key })
        .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
        .getRawOne();

      result.push({
        label,
        novas: parseInt(novasRow?.total || '0', 10),
        recompra: 0,
      });
    }

    return result;
  }

  async getTitleDistribution() {
    const dist = await this.userRepo
      .createQueryBuilder('u')
      .select('u.title', 'title')
      .addSelect('COUNT(*)', 'count')
      .where('u.deletedAt IS NULL')
      .groupBy('u.title')
      .getRawMany();

    const result: Record<string, number> = { bronze: 0, prata: 0, ouro: 0, diamante: 0 };
    for (const d of dist) {
      const key = (d.title as string)?.toLowerCase();
      if (key in result) result[key] = parseInt(d.count, 10);
    }
    return result;
  }

  async getCrmUsers() {
    return this.userRepo.find({
      where: { deletedAt: IsNull() },
      order: { totalEarnings: 'DESC' },
      select: ['id', 'name', 'title', 'totalEarnings', 'isActive', 'email', 'phone', 'purchasedQuotas', 'adminGrantedQuotas', 'splitQuotas', 'quotaBalance', 'partnerLevel', 'lastPurchaseDate'],
    });
  }

  // ─── Price Engine ──────────────────────────────────────

  async getPriceEngine() {
    const state = await this.splitEngine.getState();
    
    // lotSold = how many quotas sold in the current lot (distance from last event to now)
    // lotSize = target quotas per lot for current split level
    const lotSize = state.nextEventTarget ? state.nextEventTarget - (state.nextEventTarget - 50 * Math.pow(2, state.splitCount)) : 50;
    const currentTarget = state.nextEventTarget || 50;
    const lotSold = Math.max(0, lotSize - (currentTarget - state.totalQuotasSold));
    
    return {
      quotaPrice: Number(state.currentQuotaPrice),
      totalQuotasSold: state.totalQuotasSold,
      splitCount: state.splitCount,
      currentPhase: state.currentPhase,
      nextEventTarget: currentTarget,
      nextEventLabel: state.nextEventLabel,
      lotSize: lotSize,
      lotSold: lotSold,
      lotNumber: state.splitCount + 1,
      pendingEventType: state.pendingEventType,
      pendingEventDate: state.pendingEventDate,
    };
  }

  async updatePriceEngine(forceSplit?: boolean) {
    if (forceSplit) {
      await this.splitEngine.forceSplit();
      return { message: 'Split forçado executado com sucesso' };
    }

    return { message: 'Nenhuma ação executada' };
  }

  // ─── Payouts (Admin-Driven 3-Stage) ────────────────────

  async calculateDistribution(profitMonth: string, netProfit: number) {
    const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    const dividendPoolPercent = settings?.profitPayoutPercentage || 20;
    const dividendPool = netProfit * dividendPoolPercent / 100;

    // ── Datas de pagamento ────────────────────────────────────────
    // Regra do cliente (2026-05): bônus de rede pagam ref+1 e dividendos
    // pagam ref+2. Mantemos `paymentMonth` legado = ref+2 (data do MAIOR
    // pagamento) para retrocompatibilidade com consumidores antigos.
    const { bonusPaymentMonth, dividendPaymentMonth } = computePaymentMonths(profitMonth);
    const paymentMonth = dividendPaymentMonth;

    // Usuários vivos — fonte de PIX (atual) e ganhos da vida (acumulador).
    const users = await this.userRepo.find({ where: { deletedAt: IsNull() } });
    const userById = new Map(users.map((u) => [u.id, u]));

    // Cotas: reconstruídas a partir das transações + splits até o fim do mês
    // de referência. É a fonte fiel mesmo se o snapshot foi capturado tarde
    // (com saldo já inflado por compras futuras) ou cedo (com saldo a menos).
    // O snapshot continua sendo lido para manter compatibilidade com quem
    // ainda não foi processado pela reconstrução.
    const snapshots = await this.snapshotService.getSnapshot(profitMonth);
    const usingSnapshot = snapshots.length > 0;
    const historicalBalances = await this.snapshotService.getHistoricalQuotaBalances(profitMonth);
    const quotaById = new Map<string, number>(
      [...historicalBalances].filter(([, bal]) => bal > 0),
    );
    const quotaOf = (userId: string) => quotaById.get(userId) ?? 0;
    const totalQuotas = [...quotaById.values()].reduce((s, q) => s + q, 0);

    // Ganhos por usuário e bonusType no mês de referência.
    const monthlyEarnings = await this.earningRepo
      .createQueryBuilder('e')
      .select('e.user_id', 'userId')
      .addSelect('e.bonus_type', 'bonusType')
      .addSelect('SUM(e.amount)', 'total')
      .where('e.reference_month = :month', { month: profitMonth })
      .groupBy('e.user_id')
      .addGroupBy('e.bonus_type')
      .getRawMany<{ userId: string; bonusType: string; total: string }>();

    const earningsMap = new Map<string, { firstPurchase: number; repurchase: number; team: number; leadership: number; dividend: number }>();
    const ensure = (uid: string) => {
      if (!earningsMap.has(uid)) {
        earningsMap.set(uid, { firstPurchase: 0, repurchase: 0, team: 0, leadership: 0, dividend: 0 });
      }
      return earningsMap.get(uid)!;
    };
    let hasPersistedBatchData = false;
    for (const row of monthlyEarnings) {
      const entry = ensure(row.userId);
      const val = parseFloat(row.total) || 0;
      if (row.bonusType === BonusType.FIRST_PURCHASE) entry.firstPurchase = val;
      else if (row.bonusType === BonusType.REPURCHASE) entry.repurchase = val;
      else if (row.bonusType === BonusType.TEAM) { entry.team = val; hasPersistedBatchData = true; }
      else if (row.bonusType === BonusType.LEADERSHIP) { entry.leadership = val; hasPersistedBatchData = true; }
      else if (row.bonusType === BonusType.DIVIDEND) { entry.dividend = val; hasPersistedBatchData = true; }
    }

    // Preview pré-batch: se ainda não houve cálculo persistido para o mês,
    // roda em memória dividendos + equipe + liderança para o admin já ver
    // o quanto vai pagar antes de aprovar o lote.
    if (!hasPersistedBatchData) {
      const previewPool = netProfit * dividendPoolPercent / 100;
      const preview = await this.bonusCalc.previewBatchAmounts(profitMonth, previewPool);
      for (const [uid, amount] of preview.dividends) ensure(uid).dividend = amount;
      for (const [uid, amount] of preview.team) ensure(uid).team = amount;
      for (const [uid, amount] of preview.leadership) ensure(uid).leadership = amount;
    }

    // Universo de pagamento: quem tem cota OU ganho de rede no mês. Antes,
    // quem tinha ganho de rede mas nenhuma cota ficava de fora do lote.
    const payeeIds = new Set<string>([...quotaById.keys(), ...earningsMap.keys()]);

    const distributions = [...payeeIds]
      .map((userId) => {
        const u = userById.get(userId);
        if (!u) return null; // usuário removido — não há como pagar

        const quotaBalance = quotaOf(userId);
        const share = totalQuotas > 0 ? quotaBalance / totalQuotas : 0;
        const breakdown = earningsMap.get(userId) || { firstPurchase: 0, repurchase: 0, team: 0, leadership: 0, dividend: 0 };
        // Dividendo já vem do preview/persistido; só recai na fórmula
        // proporcional como rede de segurança.
        const quotaAmount = breakdown.dividend > 0 ? breakdown.dividend : dividendPool * share;
        const networkAmount = breakdown.firstPurchase + breakdown.repurchase + breakdown.team + breakdown.leadership;

        return {
          userId: u.id,
          userName: u.name,
          quotaBalance,
          percentageShare: Math.round(share * 10000) / 100,
          quotaAmount: Math.round(quotaAmount * 100) / 100,
          networkAmount: Math.round(networkAmount * 100) / 100,
          firstPurchaseAmount: Math.round(breakdown.firstPurchase * 100) / 100,
          repurchaseAmount: Math.round(breakdown.repurchase * 100) / 100,
          teamAmount: Math.round(breakdown.team * 100) / 100,
          leadershipAmount: Math.round(breakdown.leadership * 100) / 100,
          lifetimeEarnings: Math.round(Number(u.totalEarnings) * 100) / 100,
          totalAmount: Math.round((quotaAmount + networkAmount) * 100) / 100,
          pixKey: u.pixKey,
          pixKeyType: u.pixKeyType,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null && d.totalAmount > 0);

    return {
      profitMonth,
      paymentMonth,
      bonusPaymentMonth,
      dividendPaymentMonth,
      netProfit,
      dividendPoolPercent,
      dividendPool,
      totalQuotasInSystem: totalQuotas,
      snapshotUsed: usingSnapshot,
      distributions,
    };
  }

  async generateBatch(
    profitMonth: string,
    netProfit: number,
    adminId: string,
    options: { allowFutureMonth?: boolean } = {},
  ) {
    // ── Bloqueio: não permitir processar mês corrente ou futuro ─────
    // Regra do cliente: o mês de competência só pode ser fechado quando já
    // tiver acabado, do contrário o lucro do mês ainda está em movimento.
    // `allowFutureMonth` é um bypass para o "Modo de testes" do frontend.
    if (!options.allowFutureMonth && profitMonth >= getCurrentPeriod()) {
      throw new BadRequestException(
        `Não é possível processar o pagamento de ${profitMonth}: o mês ainda não fechou. ` +
          `Aguarde o primeiro dia do mês seguinte para gerar este lote.`,
      );
    }
    if (options.allowFutureMonth && profitMonth >= getCurrentPeriod()) {
      this.logger.warn(`⚠️  Modo de testes: gerando lote do mês ${profitMonth} (mês não fechou).`);
    }

    // Check for existing batch FIRST (antes de qualquer cálculo)
    const existing = await this.payoutRepo.findOne({ where: { referenceMonth: profitMonth } });
    if (existing) {
      return { error: 'Já existe um lote para este mês de referência' };
    }

    // ⚡ Etapa 2 — Orquestração de bônus dependentes do lucro do mês:
    // os bônus de Equipe, Liderança e Dividendos só fazem sentido após o
    // admin informar o lucro líquido. Calculamos aqui (idempotente) e em
    // seguida montamos o lote com o breakdown já incluído.
    const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    const dividendPoolPercent = settings?.profitPayoutPercentage || 20;
    const dividendPool = netProfit * dividendPoolPercent / 100;

    // Garante o snapshot do mês (idempotente). Normalmente já foi capturado
    // pelo MonthlyCloseJob no fechamento; aqui é uma rede de segurança para o
    // caso de o lote ser gerado antes do job ter rodado.
    await this.snapshotService.captureMonth(profitMonth);

    // ⚠️ Ordem obrigatória (regra de cascata): os dividendos precisam existir
    // ANTES do cálculo de equipe/liderança, pois o bônus de equipe incide
    // também sobre os dividendos da rede. Equipe + liderança são calculados
    // por último, em travessia leaf-up — ver BonusCalculatorService.
    await this.bonusCalc.calculateDividends(profitMonth, dividendPool);
    await this.bonusCalc.calculateTeamAndLeadershipBonuses(profitMonth);

    // Marca como processados (Etapa 2) os ganhos do mês de referência que
    // ainda não haviam sido processados — incluindo os bônus imediatos
    // (FIRST_PURCHASE, REPURCHASE) gerados ao longo do mês.
    await this.earningRepo
      .createQueryBuilder()
      .update()
      .set({ processedAt: () => 'NOW()' })
      .where('reference_month = :month', { month: profitMonth })
      .andWhere('processed_at IS NULL')
      .execute();

    const preview = await this.calculateDistribution(profitMonth, netProfit);

    // ── Validações de sanidade ───────────────────────────────────────────
    // Erros bloqueiam a geração do lote; avisos são devolvidos para o admin
    // revisar, mas não impedem.
    const validation = this.validateBatch(netProfit, preview.distributions);
    if (validation.errors.length > 0) {
      this.logger.error(`❌ Lote ${profitMonth} bloqueado: ${validation.errors.join(' | ')}`);
      return { error: validation.errors.join(' | '), validationErrors: validation.errors };
    }

    const payouts: PayoutRequest[] = [];
    const missingPixKey: string[] = [];
    for (const dist of preview.distributions) {
      if (!dist.pixKey) {
        missingPixKey.push(dist.userName);
      }
      const payout = this.payoutRepo.create({
        userId: dist.userId,
        userName: dist.userName,
        referenceMonth: profitMonth,
        paymentMonth: preview.paymentMonth,
        bonusPaymentMonth: preview.bonusPaymentMonth,
        dividendPaymentMonth: preview.dividendPaymentMonth,
        quotaAmount: dist.quotaAmount,
        networkAmount: dist.networkAmount,
        firstPurchaseAmount: dist.firstPurchaseAmount,
        repurchaseAmount: dist.repurchaseAmount,
        teamAmount: dist.teamAmount,
        leadershipAmount: dist.leadershipAmount,
        lifetimeEarnings: dist.lifetimeEarnings,
        amount: dist.totalAmount,
        percentageShare: dist.percentageShare,
        netProfitRef: netProfit,
        dividendPoolRef: preview.dividendPool,
        pixKey: dist.pixKey || null,
        pixKeyType: (dist.pixKeyType as any) || null,
        generatedBy: adminId,
        status: PayoutStatus.PENDING,
      });
      payouts.push(payout);
    }

    await this.payoutRepo.save(payouts);

    if (missingPixKey.length > 0) {
      this.logger.warn(`⚠️ ${missingPixKey.length} users without PIX key included in batch (will need PIX before payment): ${missingPixKey.join(', ')}`);
    }
    this.logger.log(`📋 Batch generated for ${profitMonth}: ${payouts.length} payouts`);
    if (validation.warnings.length > 0) {
      this.logger.warn(`⚠️ Lote ${profitMonth} gerado com avisos: ${validation.warnings.join(' | ')}`);
    }

    return {
      profitMonth,
      paymentMonth: preview.paymentMonth,
      bonusPaymentMonth: preview.bonusPaymentMonth,
      dividendPaymentMonth: preview.dividendPaymentMonth,
      totalPayouts: payouts.length,
      missingPixKey: missingPixKey.length,
      totalAmount: payouts.reduce((s, p) => s + Number(p.amount), 0),
      warnings: validation.warnings,
    };
  }

  /**
   * Validações de sanidade do lote antes de gravá-lo.
   *
   * `errors`  → bloqueiam a geração (provável erro de cálculo/entrada).
   * `warnings`→ não bloqueiam; sinalizam ao admin algo a conferir.
   */
  private validateBatch(
    netProfit: number,
    distributions: Array<{
      userName: string;
      quotaAmount: number;
      networkAmount: number;
      totalAmount: number;
      pixKey: string | null;
    }>,
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (netProfit < 0) {
      errors.push('Lucro líquido não pode ser negativo.');
    }

    // Valores negativos indicam erro de cálculo — nunca devem ocorrer.
    const negativos = distributions.filter(
      (d) => d.totalAmount < 0 || d.quotaAmount < 0 || d.networkAmount < 0,
    );
    if (negativos.length > 0) {
      errors.push(
        `${negativos.length} pagamento(s) com valor negativo (erro de cálculo): ` +
          negativos.slice(0, 5).map((d) => d.userName).join(', '),
      );
    }

    const totalPayout = distributions.reduce((s, d) => s + d.totalAmount, 0);

    // O total a pagar não deveria ultrapassar o lucro líquido do mês.
    if (netProfit > 0 && totalPayout > netProfit) {
      warnings.push(
        `Total a pagar (R$${totalPayout.toFixed(2)}) excede o lucro líquido ` +
          `informado (R$${netProfit.toFixed(2)}).`,
      );
    }

    // Outliers — pagamentos muito acima da média (5×), para revisão manual.
    if (distributions.length >= 3) {
      const media = totalPayout / distributions.length;
      const outliers = distributions.filter(
        (d) => media > 0 && d.totalAmount > media * 5,
      );
      if (outliers.length > 0) {
        warnings.push(
          `${outliers.length} pagamento(s) muito acima da média — revisar: ` +
            outliers
              .slice(0, 5)
              .map((d) => `${d.userName} (R$${d.totalAmount.toFixed(2)})`)
              .join(', '),
        );
      }
    }

    const semPix = distributions.filter((d) => !d.pixKey);
    if (semPix.length > 0) {
      warnings.push(
        `${semPix.length} usuário(s) sem chave PIX — precisarão informar antes do pagamento.`,
      );
    }

    return { errors, warnings };
  }

  /**
   * Anula um lote ainda não pago, revertendo todos os efeitos colaterais,
   * para que o admin possa corrigir o lucro líquido e gerar de novo.
   *
   * Só é permitido se NENHUM pagamento do lote estiver em processamento ou
   * concluído. A reversão:
   *   1. Apaga os ganhos calculados no lote (dividendos/equipe/liderança) e
   *      desfaz o incremento correspondente em user.totalEarnings.
   *   2. Limpa o `processed_at` dos ganhos imediatos (compra/recompra) do mês.
   *   3. Apaga os PayoutRequests do mês.
   *
   * O snapshot do mês é preservado — regenerar o lote usa a mesma foto,
   * garantindo um recálculo determinístico.
   */
  async voidBatch(profitMonth: string) {
    const payouts = await this.payoutRepo.find({ where: { referenceMonth: profitMonth } });
    if (payouts.length === 0) {
      return { error: 'Nenhum lote encontrado para este mês de referência.' };
    }

    // Cliente pediu liberação do cancelamento em qualquer status (uso primário
    // em testes / reset de cenário). Importante: status COMPLETED significa
    // que o dinheiro já foi enviado ao usuário — cancelar não estorna o PIX,
    // apenas zera o registro contábil interno. Use com cuidado em produção.
    const travados = payouts.filter(
      (p) => p.status === PayoutStatus.PROCESSING || p.status === PayoutStatus.COMPLETED,
    );
    if (travados.length > 0) {
      this.logger.warn(
        `⚠️ Lote ${profitMonth} sendo anulado COM ${travados.length} pagamento(s) ` +
          `em processamento/concluído — registro contábil será revertido (PIX já enviado não é estornado).`,
      );
    }

    // 1. Reverter os ganhos calculados no lote.
    const batchEarnings = await this.earningRepo.find({
      where: {
        referenceMonth: profitMonth,
        bonusType: In([BonusType.DIVIDEND, BonusType.TEAM, BonusType.LEADERSHIP]),
      },
    });
    const decByUser = new Map<string, number>();
    for (const e of batchEarnings) {
      decByUser.set(e.userId, (decByUser.get(e.userId) ?? 0) + Number(e.amount));
    }
    for (const [userId, amount] of decByUser) {
      if (amount > 0) {
        await this.userRepo.decrement({ id: userId }, 'totalEarnings', amount);
      }
    }
    await this.earningRepo.delete({
      referenceMonth: profitMonth,
      bonusType: In([BonusType.DIVIDEND, BonusType.TEAM, BonusType.LEADERSHIP]),
    });

    // 2. Restaurar os ganhos imediatos (compra/recompra) do mês ao estado
    //    pré-lote: processed_at = NULL, status = PENDING, paid_at = NULL.
    //    Sem reverter o status, lotes que estavam COMPLETED deixavam os
    //    earnings com status PAID e a regeração começava "como se já tivessem
    //    sido pagos" — confunde testes.
    await this.earningRepo
      .createQueryBuilder()
      .update()
      .set({
        processedAt: null,
        status: EarningStatus.PENDING,
        paidAt: null,
      })
      .where('reference_month = :month', { month: profitMonth })
      .execute();

    // 3. Apagar os PayoutRequests do mês (todos PENDING/FAILED neste ponto).
    await this.payoutRepo.delete({ referenceMonth: profitMonth });

    this.logger.warn(
      `🗑️ Lote ${profitMonth} anulado: ${payouts.length} payout(s) removido(s), ` +
        `${batchEarnings.length} ganho(s) de lote revertido(s).`,
    );

    return {
      voided: true,
      profitMonth,
      removedPayouts: payouts.length,
      revertedEarnings: batchEarnings.length,
    };
  }

  async getPayouts(status?: string, month?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (month) where.referenceMonth = month;

    return this.payoutRepo.find({
      where,
      relations: ['user'],
      order: { generatedAt: 'DESC' },
    });
  }

  async getPayoutStats() {
    const pending = await this.payoutRepo.count({ where: { status: PayoutStatus.PENDING } });
    const processing = await this.payoutRepo.count({ where: { status: PayoutStatus.PROCESSING } });
    const completed = await this.payoutRepo.count({ where: { status: PayoutStatus.COMPLETED } });
    const failed = await this.payoutRepo.count({ where: { status: PayoutStatus.FAILED } });

    const pendingTotalRow = await this.payoutRepo
      .createQueryBuilder('p')
      .select('SUM(p.amount)', 'total')
      .where('p.status = :status', { status: PayoutStatus.PENDING })
      .getRawOne();

    return {
      pending,
      processing,
      completed,
      failed,
      total: pending + processing + completed + failed,
      pendingCount: pending,
      pendingTotal: parseFloat(pendingTotalRow?.total || '0'),
    };
  }

  async processPayoutAction(payoutId: string, action: string, transactionId?: string, failureReason?: string) {
    const payout = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!payout) return null;

    if (action === 'processing') {
      payout.status = PayoutStatus.PROCESSING;
      payout.processedAt = new Date();
    } else if (action === 'completed') {
      // Atalho legado: marca tudo (bônus + dividendos) como pago de uma vez.
      const now = new Date();
      if (!payout.bonusPaidAt) payout.bonusPaidAt = now;
      if (!payout.dividendPaidAt) payout.dividendPaidAt = now;
      payout.status = PayoutStatus.COMPLETED;
      payout.completedAt = now;

      await this.markEarningsPaid(payout.userId, payout.referenceMonth, [
        BonusType.FIRST_PURCHASE,
        BonusType.REPURCHASE,
        BonusType.TEAM,
        BonusType.LEADERSHIP,
        BonusType.DIVIDEND,
      ]);
    } else if (action === 'pay-bonus') {
      if (!payout.bonusPaidAt) payout.bonusPaidAt = new Date();
      await this.markEarningsPaid(payout.userId, payout.referenceMonth, [
        BonusType.FIRST_PURCHASE,
        BonusType.REPURCHASE,
        BonusType.TEAM,
        BonusType.LEADERSHIP,
      ]);
      this.finalizePayoutIfBothPaid(payout);
    } else if (action === 'pay-dividend') {
      if (!payout.dividendPaidAt) payout.dividendPaidAt = new Date();
      await this.markEarningsPaid(payout.userId, payout.referenceMonth, [
        BonusType.DIVIDEND,
      ]);
      this.finalizePayoutIfBothPaid(payout);
    } else if (action === 'failed') {
      payout.status = PayoutStatus.FAILED;
      payout.failureReason = failureReason || '';
    }

    await this.payoutRepo.save(payout);
    return payout;
  }

  /**
   * Marca o lote como COMPLETED quando bônus e dividendos foram pagos.
   * Se um dos lados for zerado (lote sem dividendos, p. ex.), considera-se
   * pago automaticamente para não travar a finalização.
   */
  private finalizePayoutIfBothPaid(payout: PayoutRequest): void {
    const noBonus = Number(payout.networkAmount || 0) <= 0;
    const noDividend = Number(payout.quotaAmount || 0) <= 0;
    const bonusDone = !!payout.bonusPaidAt || noBonus;
    const dividendDone = !!payout.dividendPaidAt || noDividend;
    if (bonusDone && dividendDone) {
      payout.status = PayoutStatus.COMPLETED;
      payout.completedAt = new Date();
    } else if (payout.status === PayoutStatus.PENDING) {
      payout.status = PayoutStatus.PROCESSING;
      if (!payout.processedAt) payout.processedAt = new Date();
    }
  }

  private async markEarningsPaid(
    userId: string,
    referenceMonth: string,
    bonusTypes: BonusType[],
  ): Promise<void> {
    await this.earningRepo
      .createQueryBuilder()
      .update()
      .set({ status: EarningStatus.PAID, paidAt: () => 'NOW()' })
      .where('user_id = :userId', { userId })
      .andWhere('reference_month = :month', { month: referenceMonth })
      .andWhere('bonus_type IN (:...types)', { types: bonusTypes })
      .andWhere('status = :status', { status: EarningStatus.PENDING })
      .execute();
  }

  async bulkPayoutAction(payoutIds: string[], action: string, transactionId?: string) {
    const results = [];
    for (const id of payoutIds) {
      const result = await this.processPayoutAction(id, action, transactionId);
      results.push(result);
    }
    return results;
  }

  // ─── Financial Config ──────────────────────────────────

  async getFinancialConfig() {
    return this.settingsRepo.findOne({ where: { id: 1 } });
  }

  async updateFinancialConfig(data: Partial<GlobalFinancialSettings>) {
    await this.settingsRepo.save({ id: 1, ...data });
    return this.settingsRepo.findOne({ where: { id: 1 } });
  }

  async getMonthlyConfig(month: string) {
    let config = await this.monthlyConfigRepo.findOne({ where: { month } });
    if (!config) {
      const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
      config = this.monthlyConfigRepo.create({
        month,
        firstPurchaseBonusPercent: 10,
        repurchaseBonusL1Percent: 5,
        repurchaseBonusL2to6Percent: 2,
        teamBonusPercent: 2,
        dividendPoolPercent: settings?.profitPayoutPercentage || 20,
        isLocked: false,
      });
      await this.monthlyConfigRepo.save(config);
    }
    return config;
  }

  async updateMonthlyConfig(month: string, data: Partial<MonthlyFinancialConfig>) {
    const config = await this.getMonthlyConfig(month);
    if (config.isLocked) return { error: 'Mês já está fechado' };

    Object.assign(config, data);
    await this.monthlyConfigRepo.save(config);
    return config;
  }

  async closeMonth(month: string) {
    const config = await this.getMonthlyConfig(month);
    config.isLocked = true;
    await this.monthlyConfigRepo.save(config);
    return { message: `Mês ${month} fechado com sucesso` };
  }

  // ─── Presentation Metrics ──────────────────────────────

  async getPresentationMetrics() {
    const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    return settings?.presentationMetrics || {};
  }

  async updatePresentationMetrics(metrics: Record<string, any>) {
    await this.settingsRepo.update(1, { presentationMetrics: metrics });
    return { message: 'Métricas atualizadas' };
  }

  // ─── Career Plan ───────────────────────────────────────

  async getCareerPlan() {
    return this.titleReqRepo.find({ order: { title: 'ASC' } });
  }

  async updateCareerPlan(titleId: number, data: Partial<TitleRequirement>) {
    await this.titleReqRepo.update(titleId, data);
    return this.titleReqRepo.findOne({ where: { id: titleId } });
  }

  // ─── Audit Log ─────────────────────────────────────────

  async getTransactionLog(filters: { type?: string; userId?: string; month?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);
    const skip = (page - 1) * limit;

    const qb = this.txnRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.user', 'u')
      .orderBy('t.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (filters.type) {
      qb.andWhere('t.type = :type', { type: filters.type });
    }
    if (filters.userId) {
      qb.andWhere('t.user_id = :userId', { userId: filters.userId });
    }
    if (filters.month) {
      qb.andWhere('t.reference_month = :month', { month: filters.month });
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      total,
      page,
      limit,
      items: items.map(t => ({
        id: t.id,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
        type: t.type,
        status: t.status,
        amount: Number(t.amount),
        quotasAffected: t.quotasAffected,
        description: t.description,
        referenceMonth: t.referenceMonth,
        userId: t.userId,
        userName: (t.user as any)?.name || '—',
        userEmail: (t.user as any)?.email || '—',
      })),
    };
  }

  // ─── Extrato do Usuário (auditoria por id) ───────────

  /**
   * Devolve uma visão completa de TODAS as movimentações de um usuário,
   * usado pela página de auditoria do administrador
   * (`/admin/users/:id`). Inclui dados básicos, compras (quota_transactions),
   * ganhos (earnings) e pagamentos (payout_requests).
   */
  async getUserExtract(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['sponsor'],
    });
    if (!user) return null;

    const [transactions, earnings, payouts] = await Promise.all([
      this.txnRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 500,
      }),
      this.earningRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 500,
      }),
      this.payoutRepo.find({
        where: { userId },
        order: { generatedAt: 'DESC' },
        take: 500,
      }),
    ]);

    const totalSpent = transactions
      .filter((t) => t.type === TransactionType.PURCHASE && t.status === TransactionStatus.COMPLETED)
      .reduce((s, t) => s + Number(t.amount), 0);

    const totalReceived = payouts
      .filter((p) => p.status === PayoutStatus.COMPLETED)
      .reduce((s, p) => s + Number(p.amount), 0);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        cpf: (user as any).cpf ?? null,
        title: user.title,
        partnerLevel: user.partnerLevel,
        isActive: user.isActive,
        sponsorName: (user as any).sponsor?.name ?? null,
        sponsorId: user.sponsorId,
        quotaBalance: user.quotaBalance,
        purchasedQuotas: user.purchasedQuotas,
        adminGrantedQuotas: (user as any).adminGrantedQuotas ?? 0,
        splitQuotas: user.splitQuotas,
        totalEarnings: Number(user.totalEarnings),
        lastPurchaseDate: user.lastPurchaseDate,
        createdAt: (user as any).createdAt,
        pixKey: (user as any).pixKey,
        pixKeyType: (user as any).pixKeyType,
      },
      summary: {
        totalSpent,
        totalReceived,
        totalEarnings: Number(user.totalEarnings),
        transactionsCount: transactions.length,
        earningsCount: earnings.length,
        payoutsCount: payouts.length,
      },
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        amount: Number(t.amount),
        quotasAffected: t.quotasAffected,
        description: t.description,
        referenceMonth: t.referenceMonth,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
      })),
      earnings: earnings.map((e) => ({
        id: e.id,
        bonusType: e.bonusType,
        amount: Number(e.amount),
        sourceUserName: e.sourceUserName,
        description: e.description,
        level: e.level,
        referenceMonth: e.referenceMonth,
        status: e.status,
        cutoffEligible: e.cutoffEligible,
        createdAt: e.createdAt,
        paidAt: e.paidAt,
      })),
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        quotaAmount: Number(p.quotaAmount),
        networkAmount: Number(p.networkAmount),
        status: p.status,
        referenceMonth: p.referenceMonth,
        paymentMonth: p.paymentMonth,
        generatedAt: p.generatedAt,
        completedAt: p.completedAt,
      })),
    };
  }
}
