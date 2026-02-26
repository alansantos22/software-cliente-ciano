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
  firstPurchaseBonusPercent: number; // 10% sobre primeira compra do indicado
  repurchaseBonusL1Percent: number; // 5% nível 1 recompra
  repurchaseBonusL2to6Percent: number; // 2% níveis 2-6 recompra
  teamBonusPercent: number; // 2% do total da equipe
  leadershipBonusOuroPercent: number; // 1% Ouro
  leadershipBonusDiamantePercent: number; // 2% Diamante
  dividendPoolPercent: number; // 20% do lucro distribuído
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
    quotaPrice: 2500,
    minWithdrawal: 100,
    maxWithdrawal: 50000,
    withdrawalFee: 2.5,
    firstPurchaseBonusPercent: 10,
    repurchaseBonusL1Percent: 5,
    repurchaseBonusL2to6Percent: 2,
    teamBonusPercent: 2,
    leadershipBonusOuroPercent: 1,
    leadershipBonusDiamantePercent: 2,
    dividendPoolPercent: 20,
    isLocked: false,
    closedAt: null,
    totalPayout: 0,
    totalBonuses: 12300,
  },
  {
    month: '2024-03',
    quotaPrice: 2500,
    minWithdrawal: 100,
    maxWithdrawal: 50000,
    withdrawalFee: 2.5,
    firstPurchaseBonusPercent: 10,
    repurchaseBonusL1Percent: 5,
    repurchaseBonusL2to6Percent: 2,
    teamBonusPercent: 2,
    leadershipBonusOuroPercent: 1,
    leadershipBonusDiamantePercent: 2,
    dividendPoolPercent: 20,
    isLocked: true,
    closedAt: '2024-04-05T23:59:59Z',
    totalPayout: 43000,
    totalBonuses: 45800,
  },
  {
    month: '2024-02',
    quotaPrice: 2500,
    minWithdrawal: 100,
    maxWithdrawal: 50000,
    withdrawalFee: 2.0,
    firstPurchaseBonusPercent: 10,
    repurchaseBonusL1Percent: 5,
    repurchaseBonusL2to6Percent: 2,
    teamBonusPercent: 2,
    leadershipBonusOuroPercent: 1,
    leadershipBonusDiamantePercent: 2,
    dividendPoolPercent: 20,
    isLocked: true,
    closedAt: '2024-03-05T23:59:59Z',
    totalPayout: 7500,
    totalBonuses: 32500,
  },
  {
    month: '2024-01',
    quotaPrice: 2500,
    minWithdrawal: 100,
    maxWithdrawal: 50000,
    withdrawalFee: 2.0,
    firstPurchaseBonusPercent: 10,
    repurchaseBonusL1Percent: 5,
    repurchaseBonusL2to6Percent: 2,
    teamBonusPercent: 2,
    leadershipBonusOuroPercent: 1,
    leadershipBonusDiamantePercent: 2,
    dividendPoolPercent: 20,
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

// Title qualification thresholds (network-based, NOT purchase-based)
export interface TitleRequirements {
  title: string;
  requirement: string; // Human-readable description
  repurchaseLevels: number; // Quantos níveis de recompra desbloqueia
  teamLevels: number; // Quantos níveis de bônus equipe desbloqueia
  leadershipPercent: number; // % de liderança (0 para bronze/prata)
  /**
   * Movimentação mínima (R$) que a rede do usuário precisa gerar no mês
   * para que ele CONQUISTE este título naquele ciclo.
   * null = sem exigência de movimentação.
   */
  minNetworkMovement: number | null;
  /**
   * Até qual nível da rede a movimentação é contabilizada.
   * null = sem exigência.
   */
  networkLevelsDepth: number | null;
}

export const mockTitleRequirements: TitleRequirements[] = [
  { title: 'none',    requirement: 'Sem título',                       repurchaseLevels: 0, teamLevels: 0, leadershipPercent: 0, minNetworkMovement: null, networkLevelsDepth: null },
  { title: 'bronze',  requirement: '2 pessoas ativas na rede',         repurchaseLevels: 1, teamLevels: 2, leadershipPercent: 0, minNetworkMovement: null, networkLevelsDepth: null },
  { title: 'silver',  requirement: 'Ajudar 1 indicado a virar Bronze', repurchaseLevels: 2, teamLevels: 3, leadershipPercent: 0, minNetworkMovement: 5000, networkLevelsDepth: 3    },
  { title: 'gold',    requirement: '2 Bronzes em linhas diferentes',   repurchaseLevels: 4, teamLevels: 4, leadershipPercent: 1, minNetworkMovement: null, networkLevelsDepth: null },
  { title: 'diamond', requirement: '3 Bronzes em linhas diferentes',   repurchaseLevels: 6, teamLevels: 5, leadershipPercent: 2, minNetworkMovement: null, networkLevelsDepth: null },
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
    benefits: [
      'Participação nos lucros do Grupo Ciano',
      'Participação na valorização do grupo',
      'Pode indicar e ganhar comissões',
      'Acesso ao grupo geral de investidores',
    ],
  },
  {
    level: 'platinum',
    minQuotas: 10,
    monthlyFee: 0,
    benefits: [
      'Todos os benefícios do Sócio',
      '30% de desconto em pousadas Ciano',
      'Comissão maior nas indicações',
      'Acesso antecipado a lotes com desconto',
      'Reunião mensal com Marcos Maziero',
    ],
  },
  {
    level: 'vip',
    minQuotas: 20,
    monthlyFee: 0,
    benefits: [
      'Todos os benefícios do Platinum',
      '50% de desconto em pousadas Ciano',
      '1 final de semana gratuito por ano',
      'Convites para eventos e inaugurações',
      'Nome listado como Sócio VIP em todas as pousadas',
      'Comissão ainda maior nas indicações',
    ],
  },
  {
    level: 'imperial',
    minQuotas: 60,
    monthlyFee: 0,
    benefits: [
      'Todos os benefícios do VIP',
      'Hospedagem gratuita ilimitada (até 3 acompanhantes)',
      'Máx. 1 quarto simultâneo',
      'Pode morar em pousada',
      '40% de desconto para familiares',
      'Viagem anual com Marcos Maziero',
      'Quadro com foto no hall de entrada',
      'Canal VIP direto com Marcos Maziero',
      'Acesso ao grupo Imperial exclusivo',
    ],
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
  if (level === 1) return baseAmount * (config.firstPurchaseBonusPercent / 100);
  if (level >= 2 && level <= 6) {
    return baseAmount * (config.repurchaseBonusL2to6Percent / 100);
  }
  return 0;
}
