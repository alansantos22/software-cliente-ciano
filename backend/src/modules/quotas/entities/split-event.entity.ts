import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';
import { SplitEventType } from '../../../shared/interfaces/enums';

@Entity('split_events')
export class SplitEvent {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'enum', enum: SplitEventType, name: 'event_type' })
  eventType: SplitEventType;

  @Column({ type: 'datetime', name: 'triggered_at', default: () => 'CURRENT_TIMESTAMP' })
  triggeredAt: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'old_quota_price' })
  oldQuotaPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'new_quota_price' })
  newQuotaPrice: number;

  @Column({ type: 'int', default: 0, name: 'split_number' })
  splitNumber: number;

  @Column({ type: 'int', default: 0 })
  phase: number;

  @Column({ type: 'int', default: 0, name: 'quotas_sold_total' })
  quotasSoldTotal: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;
}
