import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PayoutRequest } from '../../payouts/entities/payout-request.entity';

@Entity('admin_payment_checks')
@Unique('uq_payment_check', ['payoutId'])
export class AdminPaymentCheck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'payout_id' })
  payoutId: string;

  @ManyToOne(() => PayoutRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payout_id' })
  payout: PayoutRequest;

  @Column({ type: 'varchar', length: 7, name: 'reference_month' })
  referenceMonth: string;

  @Column({ type: 'varchar', length: 36, name: 'checked_by' })
  checkedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'checked_by' })
  checkedByAdmin: User;

  @Column({ type: 'datetime', name: 'checked_at', default: () => 'CURRENT_TIMESTAMP' })
  checkedAt: Date;
}
