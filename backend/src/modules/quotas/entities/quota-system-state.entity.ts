import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';
import { SplitEventType } from '../../../shared/interfaces/enums';

@Entity('quota_system_state')
export class QuotaSystemState {
  @PrimaryColumn({ type: 'int', default: 1 })
  id: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 2500, name: 'current_quota_price' })
  currentQuotaPrice: number;

  @Column({ type: 'int', default: 0, name: 'total_quotas_sold' })
  totalQuotasSold: number;

  @Column({ type: 'int', default: 0, name: 'total_split_quotas' })
  totalSplitQuotas: number;

  @Column({ type: 'int', default: 0, name: 'split_count' })
  splitCount: number;

  @Column({ type: 'int', default: 0, name: 'current_phase' })
  currentPhase: number;

  @Column({ type: 'int', default: 50, name: 'next_event_target' })
  nextEventTarget: number;

  @Column({ type: 'varchar', length: 100, default: 'Aumento de Preço', name: 'next_event_label' })
  nextEventLabel: string;

  @Column({ type: 'enum', enum: SplitEventType, nullable: true, name: 'pending_event_type' })
  pendingEventType: SplitEventType | null;

  @Column({ type: 'datetime', nullable: true, name: 'pending_event_date' })
  pendingEventDate: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
