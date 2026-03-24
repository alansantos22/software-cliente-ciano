import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('monthly_financial_configs')
export class MonthlyFinancialConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 7, unique: true })
  month: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 2500, name: 'quota_price' })
  quotaPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10, name: 'first_purchase_bonus_percent' })
  firstPurchaseBonusPercent: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5, name: 'repurchase_bonus_l1_percent' })
  repurchaseBonusL1Percent: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 2, name: 'repurchase_bonus_l2to6_percent' })
  repurchaseBonusL2to6Percent: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 2, name: 'team_bonus_percent' })
  teamBonusPercent: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1, name: 'leadership_bonus_ouro_percent' })
  leadershipBonusOuroPercent: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 2, name: 'leadership_bonus_diamante_percent' })
  leadershipBonusDiamantePercent: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 20, name: 'dividend_pool_percent' })
  dividendPoolPercent: number;

  @Column({ type: 'boolean', default: false, name: 'is_locked' })
  isLocked: boolean;

  @Column({ type: 'datetime', nullable: true, name: 'closed_at' })
  closedAt: Date | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'total_payout' })
  totalPayout: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'total_bonuses' })
  totalBonuses: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
