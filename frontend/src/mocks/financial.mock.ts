// ========================================
// MOCK: Financial Config - Sistema de Cotas Ciano
// ========================================

export interface MonthlyFinancialConfig {
  month: string; // YYYY-MM
  quotaPrice: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  withdrawalFee: number; // Percentage
  // Bonus percentages for this month
  directBonusPercent: number;
  indirectBonusLevels: number[]; // 5 levels
  residualBonusPercent: number;
  leadershipBonusPercent: number;
  performanceBonusPercent: number;
  fidelityBonusPercent: number;
  // Qualification requirements
  minQuotasForBonus: number;
  minActiveDirectsForLeadership: number;
  minTeamVolumeForPerformance: number;
  // Status
  isLocked: boolean; // True if month is closed
  closedAt: string | null;
  totalPayout: number;
  totalBonuses: number;
}

export interface GlobalFinancialSettings {
  companyName: string;
  cnpj: string;
  defaultCurrency: string;
  paymentDay: number; // Day of month for payouts
  gracePeriodDays: number; // Days to request withdrawal
  // PIX settings
  pixEnabled: boolean;
  pixBatchTime: string; // Time of day for batch processing
  // Limits
  globalMinWithdrawal: number;
  globalMaxWithdrawal: number;
  dailyWithdrawalLimit: number;
  // Tax settings
  taxWithholding: boolean;
  taxRate: number; // If applicable
}

// Monthly configurations
export const mockMonthlyConfigs: MonthlyFinancialConfig[] = [
  {
    month: '2024-04',
    quotaPrice: 1000,
    minWithdrawal: 100,
    maxWithdrawal: 50000,
    withdrawalFee: 2.5,
    directBonusPercent: 10,
    indirectBonusLevels: [5, 3, 2, 1, 1],
    residualBonusPercent: 2,
    leadershipBonusPercent: 3,
    performanceBonusPercent: 5,
    fidelityBonusPercent: 1,
    minQuotasForBonus: 1,
    minActiveDirectsForLeadership: 5,
    minTeamVolumeForPerformance: 100000,
    isLocked: false,
    closedAt: null,
    totalPayout: 0,
    totalBonuses: 12300,
  },
  {
    month: '2024-03',
    quotaPrice: 1000,
    minWithdrawal: 100,
    maxWithdrawal: 50000,
    withdrawalFee: 2.5,
    directBonusPercent: 10,
    indirectBonusLevels: [5, 3, 2, 1, 1],
    residualBonusPercent: 2,
    leadershipBonusPercent: 3,
    performanceBonusPercent: 5,
    fidelityBonusPercent: 1,
    minQuotasForBonus: 1,
    minActiveDirectsForLeadership: 5,
    minTeamVolumeForPerformance: 100000,
    isLocked: true,
    closedAt: '2024-04-05T23:59:59Z',
    totalPayout: 43000,
    totalBonuses: 45800,
  },
  {
    month: '2024-02',
    quotaPrice: 1000,
    minWithdrawal: 100,
    maxWithdrawal: 50000,
    withdrawalFee: 2.0, // Lower fee in Feb
    directBonusPercent: 10,
    indirectBonusLevels: [5, 3, 2, 1, 1],
    residualBonusPercent: 2,
    leadershipBonusPercent: 3,
    performanceBonusPercent: 5,
    fidelityBonusPercent: 1,
    minQuotasForBonus: 1,
    minActiveDirectsForLeadership: 5,
    minTeamVolumeForPerformance: 100000,
    isLocked: true,
    closedAt: '2024-03-05T23:59:59Z',
    totalPayout: 7500,
    totalBonuses: 32500,
  },
  {
    month: '2024-01',
    quotaPrice: 1000,
    minWithdrawal: 100,
    maxWithdrawal: 50000,
    withdrawalFee: 2.0,
    directBonusPercent: 10,
    indirectBonusLevels: [5, 3, 2, 1, 1],
    residualBonusPercent: 2,
    leadershipBonusPercent: 3,
    performanceBonusPercent: 5,
    fidelityBonusPercent: 1,
    minQuotasForBonus: 1,
    minActiveDirectsForLeadership: 5,
    minTeamVolumeForPerformance: 100000,
    isLocked: true,
    closedAt: '2024-02-05T23:59:59Z',
    totalPayout: 5000,
    totalBonuses: 28000,
  },
];

// Global settings
export const mockGlobalSettings: GlobalFinancialSettings = {
  companyName: 'Grupo de Pousadas Ciano',
  cnpj: '12.345.678/0001-90',
  defaultCurrency: 'BRL',
  paymentDay: 5,
  gracePeriodDays: 5,
  pixEnabled: true,
  pixBatchTime: '14:00',
  globalMinWithdrawal: 50,
  globalMaxWithdrawal: 100000,
  dailyWithdrawalLimit: 500000,
  taxWithholding: false,
  taxRate: 0,
};

// Title qualification thresholds
export interface TitleRequirements {
  title: string;
  minQuotas: number;
  minDirects: number;
  minTeamVolume: number;
  bonusMultiplier: number;
}

export const mockTitleRequirements: TitleRequirements[] = [
  { title: 'none', minQuotas: 0, minDirects: 0, minTeamVolume: 0, bonusMultiplier: 1.0 },
  { title: 'bronze', minQuotas: 5, minDirects: 2, minTeamVolume: 10000, bonusMultiplier: 1.1 },
  { title: 'silver', minQuotas: 15, minDirects: 4, minTeamVolume: 30000, bonusMultiplier: 1.25 },
  { title: 'gold', minQuotas: 30, minDirects: 6, minTeamVolume: 75000, bonusMultiplier: 1.5 },
  { title: 'diamond', minQuotas: 50, minDirects: 10, minTeamVolume: 150000, bonusMultiplier: 2.0 },
];

// Partner level requirements
export interface PartnerLevelRequirements {
  level: string;
  minQuotas: number;
  monthlyFee: number;
  benefits: string[];
}

export const mockPartnerLevels: PartnerLevelRequirements[] = [
  {
    level: 'socio',
    minQuotas: 1,
    monthlyFee: 0,
    benefits: ['Acesso ao sistema', 'Bônus direto', 'Suporte básico'],
  },
  {
    level: 'platinum',
    minQuotas: 10,
    monthlyFee: 0,
    benefits: ['Tudo do Sócio', 'Bônus indireto 3 níveis', 'Suporte prioritário', 'Relatórios avançados'],
  },
  {
    level: 'vip',
    minQuotas: 25,
    monthlyFee: 0,
    benefits: ['Tudo do Platinum', 'Bônus indireto 5 níveis', 'Bônus de liderança', 'Eventos exclusivos'],
  },
  {
    level: 'imperial',
    minQuotas: 50,
    monthlyFee: 0,
    benefits: ['Tudo do VIP', 'Bônus de performance', 'Assessoria dedicada', 'Participação nos lucros'],
  },
];

// Helper functions
export function getConfigForMonth(month: string): MonthlyFinancialConfig | undefined {
  return mockMonthlyConfigs.find((c) => c.month === month);
}

export function getCurrentMonthConfig(): MonthlyFinancialConfig {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const config = getConfigForMonth(currentMonth);
  if (config) return config;
  // Fallback to first config (always exists in mock data)
  return mockMonthlyConfigs[0] as MonthlyFinancialConfig;
}

export function getLockedMonths(): MonthlyFinancialConfig[] {
  return mockMonthlyConfigs.filter((c) => c.isLocked);
}

export function getTitleRequirements(title: string): TitleRequirements | undefined {
  return mockTitleRequirements.find((t) => t.title === title);
}

export function getPartnerLevelInfo(level: string): PartnerLevelRequirements | undefined {
  return mockPartnerLevels.find((p) => p.level === level);
}

export function calculateBonusForLevel(
  baseAmount: number,
  level: number,
  config: MonthlyFinancialConfig
): number {
  if (level === 1) return baseAmount * (config.directBonusPercent / 100);
  if (level >= 2 && level <= 6) {
    const indirectPercent = config.indirectBonusLevels[level - 2] || 0;
    return baseAmount * (indirectPercent / 100);
  }
  return 0;
}
