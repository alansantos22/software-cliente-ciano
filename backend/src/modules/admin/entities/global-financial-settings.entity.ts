import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';
import { ClosingDayMode } from '../../../shared/interfaces/enums';

@Entity('global_financial_settings')
export class GlobalFinancialSettings {
  @PrimaryColumn({ type: 'int', default: 1 })
  id: number;

  @Column({ type: 'varchar', length: 255, default: 'Grupo de Pousadas Ciano', name: 'company_name' })
  companyName: string;

  @Column({ type: 'varchar', length: 20, default: '12.345.678/0001-90' })
  cnpj: string;

  @Column({ type: 'varchar', length: 3, default: 'BRL', name: 'default_currency' })
  defaultCurrency: string;

  @Column({ type: 'enum', enum: ClosingDayMode, default: ClosingDayMode.FIXED, name: 'closing_day_mode' })
  closingDayMode: ClosingDayMode;

  @Column({ type: 'int', nullable: true, default: 25, name: 'closing_day' })
  closingDay: number | null;

  @Column({ type: 'int', default: 5, name: 'payment_day' })
  paymentDay: number;

  @Column({ type: 'boolean', default: true, name: 'pix_enabled' })
  pixEnabled: boolean;

  @Column({ type: 'int', default: 1, name: 'min_quotas' })
  minQuotas: number;

  @Column({ type: 'int', default: 200, name: 'max_quotas_per_user' })
  maxQuotasPerUser: number;

  @Column({ type: 'int', default: 10000, name: 'total_quotas_available' })
  totalQuotasAvailable: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'total_company_profit' })
  totalCompanyProfit: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 20, name: 'profit_payout_percentage' })
  profitPayoutPercentage: number;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'manager_password_hash' })
  managerPasswordHash: string | null;

  // Presentation metrics (editable by admin, shown on landing/quota info page)
  @Column({ type: 'json', nullable: true, name: 'presentation_metrics' })
  presentationMetrics: Record<string, unknown> | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
