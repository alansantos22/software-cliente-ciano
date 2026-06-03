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

  // ─── Gateway de pagamento (PagBank/PagSeguro) ────────────────────────────
  /** Nome do provedor de pagamento (ex: 'pagbank'). */
  @Column({ type: 'varchar', length: 20, nullable: true })
  gateway: string | null;

  /** ID do checkout retornado pelo gateway na criação. */
  @Index('idx_quota_txn_checkout')
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'gateway_checkout_id' })
  gatewayCheckoutId: string | null;

  /** ID do pedido/charge informado pelo gateway na confirmação. */
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'gateway_order_id' })
  gatewayOrderId: string | null;

  /** Link de pagamento (redirect rel=PAY) para onde o usuário é enviado. */
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'payment_url' })
  paymentUrl: string | null;

  @Index('idx_quota_txn_month')
  @Column({ type: 'varchar', length: 7, name: 'reference_month' })
  referenceMonth: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true, name: 'completed_at' })
  completedAt: Date | null;

  /** Momento em que o pagamento foi confirmado pelo gateway. */
  @Column({ type: 'datetime', nullable: true, name: 'paid_at' })
  paidAt: Date | null;
}
