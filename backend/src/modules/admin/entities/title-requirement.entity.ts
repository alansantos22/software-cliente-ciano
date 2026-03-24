import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';
import { UserTitle, TitleReqType, TitleReqLevel } from '../../../shared/interfaces/enums';

@Entity('title_requirements')
export class TitleRequirement {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'enum', enum: UserTitle, unique: true })
  title: UserTitle;

  @Column({ type: 'varchar', length: 500, name: 'requirement_desc' })
  requirementDesc: string;

  @Column({ type: 'enum', enum: TitleReqType, nullable: true, name: 'req_type' })
  reqType: TitleReqType | null;

  @Column({ type: 'int', nullable: true, name: 'req_quantity' })
  reqQuantity: number | null;

  @Column({ type: 'enum', enum: TitleReqLevel, nullable: true, name: 'req_level' })
  reqLevel: TitleReqLevel | null;

  @Column({ type: 'int', default: 0, name: 'repurchase_levels' })
  repurchaseLevels: number;

  @Column({ type: 'int', default: 0, name: 'team_levels' })
  teamLevels: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'leadership_percent' })
  leadershipPercent: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, name: 'min_network_movement' })
  minNetworkMovement: number | null;

  @Column({ type: 'int', nullable: true, name: 'network_levels_depth' })
  networkLevelsDepth: number | null;
}
