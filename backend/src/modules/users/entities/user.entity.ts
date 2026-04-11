import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import {
  UserRole,
  UserTitle,
  PartnerLevel,
  PixKeyType,
} from '../../../shared/interfaces/enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 14, unique: true })
  cpf: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 2 })
  state: string;

  @Column({ type: 'varchar', length: 255, name: 'pix_key' })
  pixKey: string;

  @Column({ type: 'enum', enum: PixKeyType, nullable: true, name: 'pix_key_type' })
  pixKeyType: PixKeyType | null;

  @Index('idx_users_role')
  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Index('idx_users_title')
  @Column({ type: 'enum', enum: UserTitle, default: UserTitle.NONE })
  title: UserTitle;

  @Index('idx_users_partner_level')
  @Column({ type: 'enum', enum: PartnerLevel, default: PartnerLevel.SOCIO, name: 'partner_level' })
  partnerLevel: PartnerLevel;

  @Index('idx_users_sponsor')
  @Column({ type: 'varchar', length: 36, nullable: true, name: 'sponsor_id' })
  sponsorId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sponsor_id' })
  sponsor: User;

  @OneToMany(() => User, (user) => user.sponsor)
  referrals: User[];

  @Index('idx_users_referral')
  @Column({ type: 'varchar', length: 20, unique: true, name: 'referral_code' })
  referralCode: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'avatar_url' })
  avatarUrl: string | null;

  @Index('idx_users_active')
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'int', default: 0, name: 'purchased_quotas' })
  purchasedQuotas: number;

  @Column({ type: 'int', default: 0, name: 'admin_granted_quotas' })
  adminGrantedQuotas: number;

  @Column({ type: 'int', default: 0, name: 'split_quotas' })
  splitQuotas: number;

  @Column({ type: 'int', default: 0, name: 'quota_balance' })
  quotaBalance: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'total_earnings' })
  totalEarnings: number;

  @Column({ type: 'datetime', nullable: true, name: 'last_purchase_date' })
  lastPurchaseDate: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Index('idx_users_deleted')
  @Column({ type: 'datetime', nullable: true, name: 'deleted_at' })
  deletedAt: Date | null;

  @Column({ type: 'int', default: 0, name: 'direct_count' })
  directCount: number;

  @Column({ type: 'int', default: 0, name: 'team_count' })
  teamCount: number;
}
