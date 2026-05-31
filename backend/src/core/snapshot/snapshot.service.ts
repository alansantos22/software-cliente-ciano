import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { MonthlyUserSnapshot } from '../../modules/users/entities/monthly-user-snapshot.entity';
import { TitleRequirement } from '../../modules/admin/entities/title-requirement.entity';
import { QuotaTransaction } from '../../modules/quotas/entities/quota-transaction.entity';
import { SplitEvent } from '../../modules/quotas/entities/split-event.entity';
import { SplitEventType, TransactionStatus } from '../../shared/interfaces/enums';

/**
 * Captura e leitura das fotos mensais de usuários (`monthly_user_snapshots`).
 *
 * O snapshot congela título, cotas, status e níveis de bônus no fechamento do
 * mês, tornando o cálculo de pagamentos determinístico — ver
 * `MonthlyUserSnapshot`.
 */
@Injectable()
export class SnapshotService {
  private readonly logger = new Logger(SnapshotService.name);

  constructor(
    @InjectRepository(MonthlyUserSnapshot)
    private readonly snapshotRepo: Repository<MonthlyUserSnapshot>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(TitleRequirement)
    private readonly titleReqRepo: Repository<TitleRequirement>,
    @InjectRepository(QuotaTransaction)
    private readonly txnRepo: Repository<QuotaTransaction>,
    @InjectRepository(SplitEvent)
    private readonly splitEventRepo: Repository<SplitEvent>,
  ) {}

  /**
   * Saldo de cotas que cada usuário tinha NO FIM do mês informado.
   *
   * Reconstrói a posição replaying `quota_transactions` (compra/admin grant)
   * e `split_events` em ordem cronológica até a data de corte. Independe de
   * snapshots e de `user.quotaBalance` atual — é a única fonte fiel quando o
   * lote é gerado meses depois da competência. Devolve `Map<userId, balance>`.
   */
  async getHistoricalQuotaBalances(month: string): Promise<Map<string, number>> {
    const [y, m] = month.split('-').map(Number);
    // Corte = primeiro instante do mês seguinte (exclusivo). Inclui tudo até
    // o último segundo do mês de referência.
    const cutoff = new Date(y, m, 1);

    const txns = await this.txnRepo.find({
      where: { status: TransactionStatus.COMPLETED, completedAt: LessThan(cutoff) },
      order: { completedAt: 'ASC' },
    });

    const splits = await this.splitEventRepo.find({
      where: { eventType: SplitEventType.SPLIT, triggeredAt: LessThan(cutoff) },
      order: { triggeredAt: 'ASC' },
    });

    const balances = new Map<string, number>();
    let ti = 0;
    let si = 0;

    while (ti < txns.length || si < splits.length) {
      const t = txns[ti];
      const s = splits[si];

      // Em empate de timestamp processamos a transação antes do split — o
      // split deve incidir sobre tudo que já estava em saldo.
      const takeSplit =
        !t || (!!s && s.triggeredAt.getTime() < (t.completedAt?.getTime() ?? 0));

      if (takeSplit) {
        for (const [uid, bal] of balances) balances.set(uid, bal * 2);
        si++;
      } else {
        const current = balances.get(t!.userId) ?? 0;
        balances.set(t!.userId, current + (t!.quotasAffected ?? 0));
        ti++;
      }
    }

    return balances;
  }

  private isActive(user: User): boolean {
    if (!user.lastPurchaseDate) return false;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return user.lastPurchaseDate > sixMonthsAgo;
  }

  /**
   * Captura a foto de todos os usuários para o mês informado.
   *
   * Idempotente por padrão: se já existir snapshot para o mês, não faz nada —
   * é o comportamento correto para um mês JÁ FECHADO, cujo snapshot deve ser
   * imutável (determinismo).
   *
   * `opts.force = true` recaptura: apaga o snapshot existente e tira uma foto
   * nova do estado ATUAL. Usado enquanto o mês ainda está ABERTO (prévia do
   * admin / Modo de testes), porque aí o snapshot não é uma verdade histórica e
   * sim um rascunho — e precisa refletir mudanças posteriores na rede (novos
   * downlines, vínculos, títulos). Sem isso, uma foto capturada cedo e rasa
   * fazia o bônus de equipe/liderança parar no 1º nível (a travessia só
   * enxergava a árvore congelada incompleta).
   */
  async captureMonth(
    month: string,
    opts: { force?: boolean } = {},
  ): Promise<{ created: number; skipped: boolean }> {
    const existing = await this.snapshotRepo.count({ where: { month } });
    if (existing > 0) {
      if (!opts.force) {
        this.logger.log(`⏭️  Snapshot de ${month} já existe (${existing} registros) — pulando`);
        return { created: 0, skipped: true };
      }
      await this.snapshotRepo.delete({ month });
      this.logger.warn(
        `♻️  Snapshot de ${month} recapturado (force) — ${existing} registro(s) antigos removidos`,
      );
    }

    const users = await this.userRepo.find({ where: { deletedAt: IsNull() } });
    const titleReqs = await this.titleReqRepo.find();
    const reqByTitle = new Map(titleReqs.map((r) => [r.title, r]));

    // Saldo de cota de cada usuário NO FIM do mês de referência — reconstruído
    // a partir das transações + splits. Não depende de `user.quotaBalance`
    // atual, que pode estar à frente se a captura aconteceu meses depois.
    const balancesAtMonthEnd = await this.getHistoricalQuotaBalances(month);

    const snapshots = users.map((u) => {
      const req = reqByTitle.get(u.title);
      const balance = balancesAtMonthEnd.get(u.id) ?? 0;
      return this.snapshotRepo.create({
        userId: u.id,
        month,
        name: u.name,
        sponsorId: u.sponsorId,
        title: u.title,
        partnerLevel: u.partnerLevel,
        repurchaseLevels: req?.repurchaseLevels ?? 0,
        teamLevels: req?.teamLevels ?? 0,
        leadershipPercent: req ? Number(req.leadershipPercent) : 0,
        purchasedQuotas: u.purchasedQuotas,
        adminGrantedQuotas: u.adminGrantedQuotas ?? 0,
        splitQuotas: u.splitQuotas,
        quotaBalance: balance,
        isActive: this.isActive(u),
        lastPurchaseDate: u.lastPurchaseDate,
        pixKey: u.pixKey ?? null,
        pixKeyType: u.pixKeyType ?? null,
      });
    });

    await this.snapshotRepo.save(snapshots);
    this.logger.log(`📸 Snapshot capturado para ${month}: ${snapshots.length} usuário(s)`);

    return { created: snapshots.length, skipped: false };
  }

  /** Devolve o snapshot completo de um mês. */
  async getSnapshot(month: string): Promise<MonthlyUserSnapshot[]> {
    return this.snapshotRepo.find({ where: { month } });
  }

  /** Indica se existe snapshot capturado para o mês. */
  async hasSnapshot(month: string): Promise<boolean> {
    const count = await this.snapshotRepo.count({ where: { month } });
    return count > 0;
  }
}
