import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_settings')
export class UserSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, unique: true, name: 'user_id' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: ['auto', 'light', 'dark'], default: 'auto' })
  theme: 'auto' | 'light' | 'dark';

  @Column({ type: 'varchar', length: 10, default: 'pt-BR' })
  language: string;

  @Column({ type: 'boolean', default: true, name: 'notify_payments' })
  notifyPayments: boolean;

  @Column({ type: 'boolean', default: true, name: 'notify_network' })
  notifyNetwork: boolean;

  @Column({ type: 'boolean', default: false, name: 'notify_promotions' })
  notifyPromotions: boolean;

  @Column({ type: 'boolean', default: true, name: 'notify_system' })
  notifySystem: boolean;
}
