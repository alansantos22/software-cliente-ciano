import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { UserTitle, PartnerLevel, PixKeyType } from '../../../shared/interfaces/enums';

/**
 * Foto imutável do estado de um usuário no fechamento de um mês.
 *
 * Capturada pelo `MonthlyCloseJob` no dia 1 às 00:00 UTC (representa o estado
 * de fim do mês anterior). Todo o cálculo de bônus de um mês de referência
 * deve ler estes valores — NÃO o estado atual do usuário — para que o
 * pagamento seja determinístico e reproduzível: lançar o lote de fevereiro em
 * abril usa o título/cotas que o usuário tinha em fevereiro.
 */
@Entity('monthly_user_snapshots')
@Unique('UQ_user_month_snapshot', ['userId', 'month'])
export class MonthlyUserSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_snapshot_user')
  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId: string;

  /** Mês de referência da foto (YYYY-MM). */
  @Index('idx_snapshot_month')
  @Column({ type: 'varchar', length: 7 })
  month: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  // ── Posição na rede ──────────────────────────────────────────────────────

  @Column({ type: 'varchar', length: 36, nullable: true, name: 'sponsor_id' })
  sponsorId: string | null;

  @Column({ type: 'enum', enum: UserTitle })
  title: UserTitle;

  @Column({ type: 'enum', enum: PartnerLevel, name: 'partner_level' })
  partnerLevel: PartnerLevel;

  // ── Níveis de bônus derivados do título (congelados p/ reprodutibilidade) ─

  @Column({ type: 'int', default: 0, name: 'repurchase_levels' })
  repurchaseLevels: number;

  @Column({ type: 'int', default: 0, name: 'team_levels' })
  teamLevels: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'leadership_percent' })
  leadershipPercent: number;

  // ── Cotas ────────────────────────────────────────────────────────────────

  @Column({ type: 'int', default: 0, name: 'purchased_quotas' })
  purchasedQuotas: number;

  @Column({ type: 'int', default: 0, name: 'admin_granted_quotas' })
  adminGrantedQuotas: number;

  @Column({ type: 'int', default: 0, name: 'split_quotas' })
  splitQuotas: number;

  @Column({ type: 'int', default: 0, name: 'quota_balance' })
  quotaBalance: number;

  // ── Status ───────────────────────────────────────────────────────────────

  /** Ativo no fechamento (comprou cota nos últimos 6 meses). */
  @Column({ type: 'boolean', default: false, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'datetime', nullable: true, name: 'last_purchase_date' })
  lastPurchaseDate: Date | null;

  // ── Dados de pagamento (registro; o PIX usado no pagamento é o atual) ─────

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'pix_key' })
  pixKey: string | null;

  @Column({ type: 'enum', enum: PixKeyType, nullable: true, name: 'pix_key_type' })
  pixKeyType: PixKeyType | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
