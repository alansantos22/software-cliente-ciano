// ========================================
// MOCK: Earnings - Sistema de Cotas Ciano
// ========================================

export type BonusType =
  | 'direct'
  | 'indirect'
  | 'residual'
  | 'leadership'
  | 'performance'
  | 'fidelity';

export interface EarningEntry {
  id: string;
  userId: string;
  bonusType: BonusType;
  amount: number;
  sourceUserId: string | null; // Who generated this bonus
  sourceUserName: string | null;
  description: string;
  level: number; // Network level (1 = direct, 2-5 = indirect)
  referenceMonth: string; // YYYY-MM
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string;
  paidAt: string | null;
}

export interface MonthlyEarningSummary {
  month: string;
  userId: string;
  direct: number;
  indirect: number;
  residual: number;
  leadership: number;
  performance: number;
  fidelity: number;
  total: number;
  lossProjection: number; // Amount that would be lost if user doesn't qualify
}

export interface UserEarningsOverview {
  userId: string;
  totalEarned: number;
  pendingEarnings: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  averageMonthly: number;
  lossProjection: number; // Current potential loss
}

// Sample earnings ledger
export const mockEarnings: EarningEntry[] = [
  // User 002 - João Silva earnings
  {
    id: 'earn-001',
    userId: 'user-002',
    bonusType: 'direct',
    amount: 2500,
    sourceUserId: 'user-005',
    sourceUserName: 'Ana Costa',
    description: 'Bônus direto - Compra de 25 cotas',
    level: 1,
    referenceMonth: '2024-02',
    status: 'paid',
    createdAt: '2024-02-20T09:20:00Z',
    paidAt: '2024-03-05T10:00:00Z',
  },
  {
    id: 'earn-002',
    userId: 'user-002',
    bonusType: 'direct',
    amount: 1500,
    sourceUserId: 'user-006',
    sourceUserName: 'Pedro Alves',
    description: 'Bônus direto - Compra de 15 cotas',
    level: 1,
    referenceMonth: '2024-03',
    status: 'paid',
    createdAt: '2024-03-01T11:50:00Z',
    paidAt: '2024-04-05T10:00:00Z',
  },
  {
    id: 'earn-003',
    userId: 'user-002',
    bonusType: 'indirect',
    amount: 500,
    sourceUserId: 'user-008',
    sourceUserName: 'Roberto Mendes',
    description: 'Bônus indireto nível 2 - Compra de 5 cotas',
    level: 2,
    referenceMonth: '2024-03',
    status: 'paid',
    createdAt: '2024-03-15T10:05:00Z',
    paidAt: '2024-04-05T10:00:00Z',
  },
  {
    id: 'earn-004',
    userId: 'user-002',
    bonusType: 'residual',
    amount: 1300,
    sourceUserId: null,
    sourceUserName: null,
    description: 'Bônus residual mensal - Equipe ativa',
    level: 0,
    referenceMonth: '2024-03',
    status: 'paid',
    createdAt: '2024-03-31T23:59:00Z',
    paidAt: '2024-04-05T10:00:00Z',
  },
  {
    id: 'earn-005',
    userId: 'user-002',
    bonusType: 'leadership',
    amount: 1950,
    sourceUserId: null,
    sourceUserName: null,
    description: 'Bônus de liderança - Título Gold',
    level: 0,
    referenceMonth: '2024-03',
    status: 'paid',
    createdAt: '2024-03-31T23:59:00Z',
    paidAt: '2024-04-05T10:00:00Z',
  },
  // User 002 - Current month (pending)
  {
    id: 'earn-006',
    userId: 'user-002',
    bonusType: 'direct',
    amount: 300,
    sourceUserId: 'user-009',
    sourceUserName: 'Fernanda Rocha',
    description: 'Bônus direto (indireto da rede)',
    level: 2,
    referenceMonth: '2024-04',
    status: 'pending',
    createdAt: '2024-04-01T09:00:00Z',
    paidAt: null,
  },
  // User 003 - Maria Santos earnings
  {
    id: 'earn-007',
    userId: 'user-003',
    bonusType: 'direct',
    amount: 800,
    sourceUserId: 'user-007',
    sourceUserName: 'Lúcia Ferreira',
    description: 'Bônus direto - Compra de 8 cotas',
    level: 1,
    referenceMonth: '2024-03',
    status: 'paid',
    createdAt: '2024-03-05T16:35:00Z',
    paidAt: '2024-04-05T10:00:00Z',
  },
  {
    id: 'earn-008',
    userId: 'user-003',
    bonusType: 'residual',
    amount: 600,
    sourceUserId: null,
    sourceUserName: null,
    description: 'Bônus residual mensal',
    level: 0,
    referenceMonth: '2024-03',
    status: 'paid',
    createdAt: '2024-03-31T23:59:00Z',
    paidAt: '2024-04-05T10:00:00Z',
  },
  // User 001 - Admin earnings
  {
    id: 'earn-009',
    userId: 'user-001',
    bonusType: 'direct',
    amount: 5000,
    sourceUserId: 'user-002',
    sourceUserName: 'João Silva',
    description: 'Bônus direto - Compra de 50 cotas',
    level: 1,
    referenceMonth: '2024-01',
    status: 'paid',
    createdAt: '2024-01-15T10:35:00Z',
    paidAt: '2024-02-05T10:00:00Z',
  },
  {
    id: 'earn-010',
    userId: 'user-001',
    bonusType: 'indirect',
    amount: 2500,
    sourceUserId: 'user-005',
    sourceUserName: 'Ana Costa',
    description: 'Bônus indireto nível 2',
    level: 2,
    referenceMonth: '2024-02',
    status: 'paid',
    createdAt: '2024-02-20T09:20:00Z',
    paidAt: '2024-03-05T10:00:00Z',
  },
  {
    id: 'earn-011',
    userId: 'user-001',
    bonusType: 'performance',
    amount: 7500,
    sourceUserId: null,
    sourceUserName: null,
    description: 'Bônus de performance - Top 10 do mês',
    level: 0,
    referenceMonth: '2024-03',
    status: 'paid',
    createdAt: '2024-03-31T23:59:00Z',
    paidAt: '2024-04-05T10:00:00Z',
  },
  {
    id: 'earn-012',
    userId: 'user-001',
    bonusType: 'fidelity',
    amount: 1000,
    sourceUserId: null,
    sourceUserName: null,
    description: 'Bônus fidelidade - 3 meses consecutivos',
    level: 0,
    referenceMonth: '2024-03',
    status: 'paid',
    createdAt: '2024-03-31T23:59:00Z',
    paidAt: '2024-04-05T10:00:00Z',
  },
];

// Monthly summaries pre-calculated
export const mockMonthlySummaries: MonthlyEarningSummary[] = [
  {
    month: '2024-03',
    userId: 'user-002',
    direct: 1500,
    indirect: 500,
    residual: 1300,
    leadership: 1950,
    performance: 0,
    fidelity: 0,
    total: 5250,
    lossProjection: 1200,
  },
  {
    month: '2024-02',
    userId: 'user-002',
    direct: 2500,
    indirect: 0,
    residual: 1000,
    leadership: 0,
    performance: 0,
    fidelity: 0,
    total: 3500,
    lossProjection: 0,
  },
  {
    month: '2024-03',
    userId: 'user-003',
    direct: 800,
    indirect: 0,
    residual: 600,
    leadership: 0,
    performance: 0,
    fidelity: 0,
    total: 1400,
    lossProjection: 400,
  },
  {
    month: '2024-03',
    userId: 'user-001',
    direct: 3000,
    indirect: 1500,
    residual: 2000,
    leadership: 2500,
    performance: 7500,
    fidelity: 1000,
    total: 17500,
    lossProjection: 0,
  },
];

// User overview
export const mockUserOverviews: UserEarningsOverview[] = [
  {
    userId: 'user-001',
    totalEarned: 250000,
    pendingEarnings: 0,
    thisMonthEarnings: 17500,
    lastMonthEarnings: 15200,
    averageMonthly: 20833,
    lossProjection: 0,
  },
  {
    userId: 'user-002',
    totalEarned: 85000,
    pendingEarnings: 300,
    thisMonthEarnings: 5250,
    lastMonthEarnings: 3500,
    averageMonthly: 7083,
    lossProjection: 1200,
  },
  {
    userId: 'user-003',
    totalEarned: 42000,
    pendingEarnings: 0,
    thisMonthEarnings: 1400,
    lastMonthEarnings: 1100,
    averageMonthly: 3500,
    lossProjection: 400,
  },
];

// Helper functions
export function getEarningsByUser(userId: string): EarningEntry[] {
  return mockEarnings.filter((e) => e.userId === userId);
}

export function getEarningsByMonth(userId: string, month: string): EarningEntry[] {
  return mockEarnings.filter((e) => e.userId === userId && e.referenceMonth === month);
}

export function getPendingEarnings(userId: string): EarningEntry[] {
  return mockEarnings.filter((e) => e.userId === userId && e.status === 'pending');
}

export function getMonthlySummary(userId: string, month: string): MonthlyEarningSummary | undefined {
  return mockMonthlySummaries.find((s) => s.userId === userId && s.month === month);
}

export function getUserOverview(userId: string): UserEarningsOverview | undefined {
  return mockUserOverviews.find((o) => o.userId === userId);
}

export function getEarningsByType(userId: string, bonusType: BonusType): EarningEntry[] {
  return mockEarnings.filter((e) => e.userId === userId && e.bonusType === bonusType);
}

export function calculateTotalByType(userId: string, bonusType: BonusType): number {
  return getEarningsByType(userId, bonusType).reduce((sum, e) => sum + e.amount, 0);
}
