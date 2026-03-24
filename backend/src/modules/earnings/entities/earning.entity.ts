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
import { BonusType, EarningStatus } from '../../../shared/interfaces/enums';

@Entity('earnings')
export class Earning {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_earnings_user')
  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index('idx_earnings_type')
  @Column({ type: 'enum', enum: BonusType, name: 'bonus_type' })
  bonusType: BonusType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Index('idx_earnings_source')
  @Column({ type: 'varchar', length: 36, nullable: true, name: 'source_user_id' })
  sourceUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_user_id' })
  sourceUser: User;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'source_user_name' })
  sourceUserName: string | null;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ type: 'int', default: 0 })
  level: number;

  @Index('idx_earnings_month')
  @Column({ type: 'varchar', length: 7, name: 'reference_month' })
  referenceMonth: string;

  @Index('idx_earnings_status')
  @Column({ type: 'enum', enum: EarningStatus, default: EarningStatus.PENDING })
  status: EarningStatus;

  @Column({ type: 'boolean', default: false, name: 'cutoff_eligible' })
  cutoffEligible: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true, name: 'paid_at' })
  paidAt: Date | null;
}
