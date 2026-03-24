import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';
import { PartnerLevel } from '../../../shared/interfaces/enums';

@Entity('partner_level_requirements')
export class PartnerLevelRequirement {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'enum', enum: PartnerLevel, unique: true })
  level: PartnerLevel;

  @Column({ type: 'int', name: 'min_quotas' })
  minQuotas: number;

  @Column({ type: 'json' })
  benefits: string[];
}
