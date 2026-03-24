import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TransactionType, TransactionStatus } from '../../../shared/interfaces/enums';

@Entity('quota_transactions')
export class QuotaTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_quota_txn_user')
  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index('idx_quota_txn_type')
  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'int', default: 0, name: 'quotas_affected' })
  quotasAffected: number;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Index('idx_quota_txn_status')
  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Index('idx_quota_txn_month')
  @Column({ type: 'varchar', length: 7, name: 'reference_month' })
  referenceMonth: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true, name: 'completed_at' })
  completedAt: Date | null;
}
