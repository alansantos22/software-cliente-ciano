import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { Earning } from '../../modules/earnings/entities/earning.entity';
import { MonthlyUserSnapshot } from '../../modules/users/entities/monthly-user-snapshot.entity';
import { TitleRequirement } from '../../modules/admin/entities/title-requirement.entity';
import { MonthlyFinancialConfig } from '../../modules/admin/entities/monthly-financial-config.entity';
import { SnapshotService } from '../snapshot/snapshot.service';
import { BonusType, UserTitle } from '../../shared/interfaces/enums';
import { getCurrentPeriod } from '../../shared/utils/helpers';

/**
 * Motor de bônus.
 *
 * Ordem de cálculo de um mês de referência (ditada pela regra de cascata):
 *   1. FIRST_PURCHASE / REPURCHASE — gerados ao longo do mês (evento de compra).
 *   2. DIVIDEND                    — gerado quando o admin informa o lucro líquido.
 *   3. TEAM + LEADERSHIP           — gerados por último, em travessia leaf-up.
 *
 * Cascata: o bônus de equipe é 2% de TUDO que a rede ganhou (compra, recompra,
 * dividendos E os próprios bônus de equipe/liderança dos downlines). Por isso o
 * cálculo precisa percorrer a árvore das folhas para a raiz — ver
 * `calculateTeamAndLeadershipBonuses`.
 */
@Injectable()
export class BonusCalculatorService {
  private readonly logger = new Logger(BonusCalculatorService.name);

  /** Percentual fixo do bônus de equipe (todos os títulos). */
  private static readonly TEAM_BONUS_RATE = 0.02;
  /** Profundidade fixa do bônus de liderança (níveis de qualificados). */
  private static readonly LEADERSHIP_DEPTH = 5;

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Earning) private readonly earningRepo: Repository<Earning>,
    @InjectRepository(TitleRequirement) private readonly titleReqRepo: Repository<TitleRequirement>,
    @InjectRepository(MonthlyFinancialConfig) private readonly monthConfigRepo: Repository<MonthlyFinancialConfig>,
    private readonly snapshotService: SnapshotService,
  ) {}

  private isActive(user: User): boolean {
    if (!user.lastPurchaseDate) return false;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return user.lastPurchaseDate > sixMonthsAgo;
  }

  /**
   * Garante que exista snapshot para o mês e o devolve.
   *
   * Caminho normal: o snapshot foi capturado pelo `MonthlyCloseJob` no
   * fechamento. Caso não exista (ex.: admin lançando um mês antes do
   * fechamento, ou ambiente recém-migrado), captura-se o estado ATUAL como
   * fallback degradado — funciona, mas não reflete o fim do mês. O aviso no
   * log sinaliza esse caso.
   */
  private async ensureSnapshot(referenceMonth: string): Promise<MonthlyUserSnapshot[]> {
    let snaps = await this.snapshotService.getSnapshot(referenceMonth);
    if (snaps.length === 0) {
      this.logger.warn(
        `⚠️  Sem snapshot para ${referenceMonth} — capturando estado ATUAL como fallback (degradado)`,
      );
      await this.snapshotService.captureMonth(referenceMonth);
      snaps = await this.snapshotService.getSnapshot(referenceMonth);
    }
    return snaps;
  }

  private getCutoffDate(referenceMonth: string): Date {
    const [y, m] = referenceMonth.split('-').map(Number);
    return new Date(y, m - 1, 0); // Last day of previous month
  }

  private isCutoffEligible(purchaseDate: Date, referenceMonth: string): boolean {
    const cutoff = this.getCutoffDate(referenceMonth);
    return purchaseDate <= cutoff;
  }

  // ─── Bônus imediatos (evento de compra) ──────────────────────────────────

  async calculateFirstPurchaseBonus(
    buyer: User,
    purchaseValue: number,
    purchaseDate: Date,
  ): Promise<void> {
    if (!buyer.sponsorId) return;

    const sponsor = await this.userRepo.findOne({ where: { id: buyer.sponsorId } });
    if (!sponsor) return;

    const month = getCurrentPeriod(purchaseDate);
    // Regra (pós-documento): 10% se o patrocinador tem cotas, 5% se não tem —
    // incentiva o patrocinador a comprar cotas para ganhar mais.
    const bonusPercent = sponsor.quotaBalance > 0 ? 10 : 5;
    const amount = purchaseValue * (bonusPercent / 100);

    const earning = this.earningRepo.create({
      userId: sponsor.id,
      bonusType: BonusType.FIRST_PURCHASE,
      amount,
      sourceUserId: buyer.id,
      sourceUserName: buyer.name,
      description: `Bônus de primeira compra de ${buyer.name}`,
      level: 1,
      referenceMonth: month,
      cutoffEligible: this.isCutoffEligible(purchaseDate, month),
    });

    await this.earningRepo.save(earning);
    await this.userRepo.increment({ id: sponsor.id }, 'totalEarnings', amount);

    this.logger.log(`💰 First purchase bonus: R$${amount} → ${sponsor.name}`);
  }

  async calculateRepurchaseBonus(
    buyer: User,
    purchaseValue: number,
    purchaseDate: Date,
  ): Promise<void> {
    const month = getCurrentPeriod(purchaseDate);
    let currentUser = buyer;

    for (let level = 1; level <= 6; level++) {
      if (!currentUser.sponsorId) break;

      const uplineUser = await this.userRepo.findOne({ where: { id: currentUser.sponsorId } });
      if (!uplineUser) break;

      // Only active users receive repurchase bonus
      if (!this.isActive(uplineUser)) {
        currentUser = uplineUser;
        continue;
      }

      // Check title unlocks sufficient levels
      const titleReq = await this.titleReqRepo.findOne({ where: { title: uplineUser.title } });
      if (!titleReq || titleReq.repurchaseLevels < level) {
        currentUser = uplineUser;
        continue;
      }

      const percent = level === 1 ? 5 : 2;
      const amount = purchaseValue * (percent / 100);

      const earning = this.earningRepo.create({
        userId: uplineUser.id,
        bonusType: BonusType.REPURCHASE,
        amount,
        sourceUserId: buyer.id,
        sourceUserName: buyer.name,
        description: `Bônus de recompra nível ${level} de ${buyer.name}`,
        level,
        referenceMonth: month,
        cutoffEligible: this.isCutoffEligible(purchaseDate, month),
      });

      await this.earningRepo.save(earning);
      await this.userRepo.increment({ id: uplineUser.id }, 'totalEarnings', amount);

      currentUser = uplineUser;
    }
  }

  // ─── Dividendos (pool de liquidez) ───────────────────────────────────────

  /**
   * Dividendos = pool de liquidez (% do lucro líquido informado pelo admin)
   * distribuída proporcionalmente às cotas. Quem detém X% da pool de cotas
   * recebe X% da pool de dividendos. Pago a TODOS que têm cotas,
   * independentemente do status ativo/inativo.
   *
   * As cotas usadas são as do SNAPSHOT do mês de referência — não o saldo
   * atual — para que o cálculo seja determinístico.
   */
  async calculateDividends(
    referenceMonth: string,
    dividendPool: number,
  ): Promise<void> {
    const already = await this.earningRepo.count({
      where: { referenceMonth, bonusType: BonusType.DIVIDEND },
    });
    if (already > 0) {
      this.logger.log(`⏭️  Dividends already calculated for ${referenceMonth} — skipping`);
      return;
    }

    this.logger.log(`💎 Calculating dividends for ${referenceMonth} — pool: R$${dividendPool}`);

    const snapshots = await this.ensureSnapshot(referenceMonth);

    const totalQuotas = snapshots.reduce((sum, s) => sum + s.quotaBalance, 0);
    if (totalQuotas === 0) return;

    for (const snap of snapshots) {
      if (snap.quotaBalance <= 0) continue;

      const amount = (dividendPool / totalQuotas) * snap.quotaBalance;

      const earning = this.earningRepo.create({
        userId: snap.userId,
        bonusType: BonusType.DIVIDEND,
        amount,
        description: `Dividendos (${snap.quotaBalance} cotas)`,
        level: 0,
        referenceMonth,
        cutoffEligible: true,
      });

      await this.earningRepo.save(earning);
      await this.userRepo.increment({ id: snap.userId }, 'totalEarnings', amount);
    }
  }

  // ─── Bônus de equipe + liderança (cascata, leaf-up) ──────────────────────

  /**
   * Calcula os bônus de equipe e liderança do mês.
   *
   * DEVE ser chamado APÓS `calculateDividends` (o bônus de equipe incide também
   * sobre os dividendos da rede).
   *
   * Lê do SNAPSHOT do mês de referência (título, níveis de bônus, posição na
   * rede e status ativo) — não o estado atual — garantindo determinismo.
   *
   * Regra de cascata: equipe = 2% de TUDO que os downlines ganharam, inclusive
   * os bônus de equipe/liderança deles. Para fechar a cascata sem recursão
   * frágil, processa-se a árvore das folhas para a raiz (ordem de altura
   * crescente): ao calcular um nó, todos os seus descendentes já têm
   * equipe/liderança gravados.
   */
  async calculateTeamAndLeadershipBonuses(referenceMonth: string): Promise<void> {
    const already = await this.earningRepo.count({
      where: [
        { referenceMonth, bonusType: BonusType.TEAM },
        { referenceMonth, bonusType: BonusType.LEADERSHIP },
      ],
    });
    if (already > 0) {
      this.logger.log(`⏭️  Team/leadership already calculated for ${referenceMonth} — skipping`);
      return;
    }

    this.logger.log(`📊👑 Calculating team + leadership bonuses for ${referenceMonth}`);

    const snapshots = await this.ensureSnapshot(referenceMonth);
    const snapById = new Map(snapshots.map((s) => [s.userId, s]));

    // Mapa patrocinador → ids dos filhos diretos (estrutura congelada no mês).
    const childrenOf = new Map<string, string[]>();
    for (const s of snapshots) {
      if (!s.sponsorId) continue;
      const arr = childrenOf.get(s.sponsorId) ?? [];
      arr.push(s.userId);
      childrenOf.set(s.sponsorId, arr);
    }

    // Altura = maior distância até uma folha. Processar por altura crescente
    // garante que todo descendente seja calculado antes do seu ancestral.
    const heightCache = new Map<string, number>();
    const heightOf = (id: string): number => {
      const cached = heightCache.get(id);
      if (cached !== undefined) return cached;
      heightCache.set(id, 0); // guarda contra ciclos acidentais
      const children = childrenOf.get(id) ?? [];
      const h = children.length === 0
        ? 0
        : 1 + Math.max(...children.map((c) => heightOf(c)));
      heightCache.set(id, h);
      return h;
    };
    const ordered = [...snapshots].sort((a, b) => heightOf(a.userId) - heightOf(b.userId));

    let teamCount = 0;
    let leadershipCount = 0;

    for (const snap of ordered) {
      // Só usuários ativos (no fechamento) RECEBEM bônus de equipe/liderança.
      if (!snap.isActive) continue;

      // ── Bônus de equipe ──────────────────────────────────────────────────
      if (snap.teamLevels > 0) {
        const downlineIds = this.collectDownlineIds(snap.userId, snap.teamLevels, childrenOf);
        const downlineEarnings = await this.sumEarnings(downlineIds, referenceMonth);

        if (downlineEarnings > 0) {
          const amount = downlineEarnings * BonusCalculatorService.TEAM_BONUS_RATE;
          await this.saveBatchBonus(
            snap.userId,
            BonusType.TEAM,
            amount,
            `Bônus de equipe (${snap.teamLevels} níveis)`,
            referenceMonth,
          );
          teamCount++;
        }
      }

      // ── Bônus de liderança ───────────────────────────────────────────────
      const leadershipPercent = Number(snap.leadershipPercent);
      if (leadershipPercent > 0) {
        const downlineIds = this.collectDownlineIds(
          snap.userId,
          BonusCalculatorService.LEADERSHIP_DEPTH,
          childrenOf,
        );
        // Apenas downlines QUALIFICADOS (Ouro/Diamante) entram na base.
        const qualifiedIds = downlineIds.filter((id) => {
          const t = snapById.get(id)?.title;
          return t === UserTitle.GOLD || t === UserTitle.DIAMOND;
        });
        const qualifiedEarnings = await this.sumEarnings(qualifiedIds, referenceMonth);

        if (qualifiedEarnings > 0) {
          const amount = qualifiedEarnings * (leadershipPercent / 100);
          await this.saveBatchBonus(
            snap.userId,
            BonusType.LEADERSHIP,
            amount,
            `Bônus de liderança (${snap.title} — ${leadershipPercent}%)`,
            referenceMonth,
          );
          leadershipCount++;
        }
      }
    }

    this.logger.log(
      `✅ Team/leadership done for ${referenceMonth}: ${teamCount} equipe, ${leadershipCount} liderança`,
    );
  }

  /** Persiste um bônus de lote (equipe/liderança) e atualiza o totalEarnings. */
  private async saveBatchBonus(
    userId: string,
    bonusType: BonusType,
    amount: number,
    description: string,
    referenceMonth: string,
  ): Promise<void> {
    const earning = this.earningRepo.create({
      userId,
      bonusType,
      amount,
      description,
      level: 0,
      referenceMonth,
      cutoffEligible: true,
    });
    await this.earningRepo.save(earning);
    await this.userRepo.increment({ id: userId }, 'totalEarnings', amount);
  }

  /**
   * Coleta os ids dos descendentes de `rootId` até `maxLevels` níveis,
   * usando o mapa de filhos em memória.
   */
  private collectDownlineIds(
    rootId: string,
    maxLevels: number,
    childrenOf: Map<string, string[]>,
  ): string[] {
    const ids: string[] = [];
    let frontier = [rootId];

    for (let level = 1; level <= maxLevels; level++) {
      const next: string[] = [];
      for (const id of frontier) {
        for (const childId of childrenOf.get(id) ?? []) next.push(childId);
      }
      if (next.length === 0) break;
      ids.push(...next);
      frontier = next;
    }

    return ids;
  }

  /**
   * Soma TODOS os ganhos (qualquer bonusType) dos usuários informados no mês.
   * Inclui FIRST_PURCHASE, REPURCHASE, DIVIDEND, TEAM e LEADERSHIP — é isso que
   * dá o efeito de cascata ao bônus de equipe/liderança.
   */
  private async sumEarnings(userIds: string[], referenceMonth: string): Promise<number> {
    if (userIds.length === 0) return 0;

    const row = await this.earningRepo
      .createQueryBuilder('e')
      .select('SUM(e.amount)', 'total')
      .where('e.user_id IN (:...ids)', { ids: userIds })
      .andWhere('e.reference_month = :month', { month: referenceMonth })
      .getRawOne();

    return parseFloat(row?.total || '0');
  }
}
