import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('monthly_payout_summaries')
export class MonthlyPayoutSummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 7, unique: true })
  month: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'total_requested' })
  totalRequested: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'total_paid' })
  totalPaid: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'total_pending' })
  totalPending: number;

  @Column({ type: 'int', default: 0, name: 'request_count' })
  requestCount: number;

  @Column({ type: 'int', default: 0, name: 'paid_count' })
  paidCount: number;

  @Column({ type: 'int', default: 0, name: 'pending_count' })
  pendingCount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'average_amount' })
  averageAmount: number;
}
