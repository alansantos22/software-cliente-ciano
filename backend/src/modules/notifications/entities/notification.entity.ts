import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('notifications')
@Unique(['userId', 'referenceKey'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_notif_user')
  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 20 })
  type: string;

  @Column({ type: 'varchar', length: 50 })
  icon: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ type: 'varchar', length: 100, name: 'reference_key' })
  referenceKey: string;

  @Index('idx_notif_read')
  @Column({ type: 'boolean', default: false, name: 'is_read' })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
