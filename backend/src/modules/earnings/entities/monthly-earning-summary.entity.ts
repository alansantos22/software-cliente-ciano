import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('monthly_earning_summaries')
@Unique('uq_earning_summary', ['userId', 'month'])
export class MonthlyEarningSummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index('idx_earning_summary_month')
  @Column({ type: 'varchar', length: 7 })
  month: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'first_purchase' })
  firstPurchase: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  repurchase: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  team: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  leadership: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  dividend: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'network_earnings' })
  networkEarnings: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'quota_earnings' })
  quotaEarnings: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'loss_projection' })
  lossProjection: number;

  @Column({ type: 'date', name: 'cutoff_date' })
  cutoffDate: string;
}
