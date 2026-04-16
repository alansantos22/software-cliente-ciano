import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PayoutStatus, PixKeyType } from '../../../shared/interfaces/enums';

@Entity('payout_requests')
export class PayoutRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_payout_user')
  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255, name: 'user_name' })
  userName: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'quota_amount' })
  quotaAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'network_amount' })
  networkAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'pix_key' })
  pixKey: string | null;

  @Column({ type: 'enum', enum: PixKeyType, nullable: true, name: 'pix_key_type' })
  pixKeyType: PixKeyType | null;

  @Index('idx_payout_status')
  @Column({ type: 'enum', enum: PayoutStatus, default: PayoutStatus.PENDING })
  status: PayoutStatus;

  @Index('idx_payout_ref_month')
  @Column({ type: 'varchar', length: 7, name: 'reference_month' })
  referenceMonth: string;

  @Index('idx_payout_pay_month')
  @Column({ type: 'varchar', length: 7, name: 'payment_month' })
  paymentMonth: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'net_profit_ref' })
  netProfitRef: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'dividend_pool_ref' })
  dividendPoolRef: number;

  @Column({ type: 'decimal', precision: 8, scale: 4, default: 0, name: 'percentage_share' })
  percentageShare: number;

  @Column({ type: 'datetime', name: 'generated_at', default: () => 'CURRENT_TIMESTAMP' })
  generatedAt: Date;

  @Column({ type: 'datetime', nullable: true, name: 'processed_at' })
  processedAt: Date | null;

  @Column({ type: 'datetime', nullable: true, name: 'completed_at' })
  completedAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'failure_reason' })
  failureReason: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'transaction_id' })
  transactionId: string | null;

  @Column({ type: 'varchar', length: 36, name: 'generated_by' })
  generatedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'generated_by' })
  generatedByAdmin: User;
}
