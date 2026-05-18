import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { MonthlyUserSnapshot } from '../../modules/users/entities/monthly-user-snapshot.entity';
import { TitleRequirement } from '../../modules/admin/entities/title-requirement.entity';

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
  ) {}

  private isActive(user: User): boolean {
    if (!user.lastPurchaseDate) return false;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return user.lastPurchaseDate > sixMonthsAgo;
  }

  /**
   * Captura a foto de todos os usuários para o mês informado.
   * Idempotente: se já existir snapshot para o mês, não faz nada.
   */
  async captureMonth(month: string): Promise<{ created: number; skipped: boolean }> {
    const existing = await this.snapshotRepo.count({ where: { month } });
    if (existing > 0) {
      this.logger.log(`⏭️  Snapshot de ${month} já existe (${existing} registros) — pulando`);
      return { created: 0, skipped: true };
    }

    const users = await this.userRepo.find({ where: { deletedAt: IsNull() } });
    const titleReqs = await this.titleReqRepo.find();
    const reqByTitle = new Map(titleReqs.map((r) => [r.title, r]));

    const snapshots = users.map((u) => {
      const req = reqByTitle.get(u.title);
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
        quotaBalance: u.quotaBalance,
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
