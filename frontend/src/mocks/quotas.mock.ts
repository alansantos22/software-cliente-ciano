// ========================================
// MOCK: Quotas - Sistema de Cotas Ciano
// ========================================

export interface QuotaConfig {
  minPurchase: number;
  maxPurchase: number;
  quotaPrice: number;
  currency: string;
  // Bonus percentages
  directBonus: number;
  indirectBonus: number[];
  residualBonus: number;
  leadershipBonus: number;
  performanceBonus: number;
  fidelityBonus: number;
}

export interface QuotaTransaction {
  id: string;
  userId: string;
  type: 'purchase' | 'bonus' | 'withdrawal' | 'refund' | 'adjustment';
  amount: number;
  quotasAffected: number;
  description: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt: string | null;
  referenceMonth: string; // YYYY-MM
}

export interface UserQuotaBalance {
  userId: string;
  totalQuotas: number;
  activeQuotas: number;
  pendingQuotas: number;
  totalInvested: number;
  currentValue: number;
  lastPurchaseDate: string | null;
}

// Quota configuration
export const mockQuotaConfig: QuotaConfig = {
  minPurchase: 1,
  maxPurchase: 100,
  quotaPrice: 1000, // R$ 1.000,00 per quota
  currency: 'BRL',
  // Bonus structure
  directBonus: 10, // 10%
  indirectBonus: [5, 3, 2, 1, 1], // 5 levels: 5%, 3%, 2%, 1%, 1%
  residualBonus: 2, // 2% monthly residual
  leadershipBonus: 3, // 3% for qualified leaders
  performanceBonus: 5, // 5% for top performers
  fidelityBonus: 1, // 1% extra for 12+ months active
};

// Sample transactions
export const mockQuotaTransactions: QuotaTransaction[] = [
  // User 002 - João Silva
  {
    id: 'txn-001',
    userId: 'user-002',
    type: 'purchase',
    amount: 50000,
    quotasAffected: 50,
    description: 'Compra inicial de cotas',
    status: 'completed',
    createdAt: '2024-01-15T10:30:00Z',
    completedAt: '2024-01-15T10:35:00Z',
    referenceMonth: '2024-01',
  },
  {
    id: 'txn-002',
    userId: 'user-002',
    type: 'bonus',
    amount: 5000,
    quotasAffected: 0,
    description: 'Bônus direto - Cadastro Ana Costa',
    status: 'completed',
    createdAt: '2024-02-20T09:20:00Z',
    completedAt: '2024-02-20T09:20:00Z',
    referenceMonth: '2024-02',
  },
  {
    id: 'txn-003',
    userId: 'user-002',
    type: 'bonus',
    amount: 2500,
    quotasAffected: 0,
    description: 'Bônus indireto - Nível 2',
    status: 'completed',
    createdAt: '2024-03-15T10:05:00Z',
    completedAt: '2024-03-15T10:05:00Z',
    referenceMonth: '2024-03',
  },
  {
    id: 'txn-004',
    userId: 'user-002',
    type: 'withdrawal',
    amount: -10000,
    quotasAffected: 0,
    description: 'Saque para conta bancária',
    status: 'completed',
    createdAt: '2024-03-25T14:00:00Z',
    completedAt: '2024-03-26T10:00:00Z',
    referenceMonth: '2024-03',
  },
  // User 003 - Maria Santos
  {
    id: 'txn-005',
    userId: 'user-003',
    type: 'purchase',
    amount: 30000,
    quotasAffected: 30,
    description: 'Compra inicial de cotas',
    status: 'completed',
    createdAt: '2024-02-01T08:00:00Z',
    completedAt: '2024-02-01T08:05:00Z',
    referenceMonth: '2024-02',
  },
  {
    id: 'txn-006',
    userId: 'user-003',
    type: 'bonus',
    amount: 800,
    quotasAffected: 0,
    description: 'Bônus direto - Cadastro Lúcia',
    status: 'completed',
    createdAt: '2024-03-05T16:35:00Z',
    completedAt: '2024-03-05T16:35:00Z',
    referenceMonth: '2024-03',
  },
  // User 005 - Ana Costa
  {
    id: 'txn-007',
    userId: 'user-005',
    type: 'purchase',
    amount: 25000,
    quotasAffected: 25,
    description: 'Compra inicial de cotas',
    status: 'completed',
    createdAt: '2024-02-20T09:15:00Z',
    completedAt: '2024-02-20T09:20:00Z',
    referenceMonth: '2024-02',
  },
  {
    id: 'txn-008',
    userId: 'user-005',
    type: 'bonus',
    amount: 500,
    quotasAffected: 0,
    description: 'Bônus direto - Cadastro Roberto',
    status: 'completed',
    createdAt: '2024-03-15T10:05:00Z',
    completedAt: '2024-03-15T10:05:00Z',
    referenceMonth: '2024-03',
  },
  // Pending transaction
  {
    id: 'txn-009',
    userId: 'user-006',
    type: 'purchase',
    amount: 5000,
    quotasAffected: 5,
    description: 'Compra adicional de cotas',
    status: 'pending',
    createdAt: '2024-04-01T09:00:00Z',
    completedAt: null,
    referenceMonth: '2024-04',
  },
];

// User balances
export const mockUserBalances: UserQuotaBalance[] = [
  {
    userId: 'user-001',
    totalQuotas: 100,
    activeQuotas: 100,
    pendingQuotas: 0,
    totalInvested: 100000,
    currentValue: 150000,
    lastPurchaseDate: '2024-01-01T00:00:00Z',
  },
  {
    userId: 'user-002',
    totalQuotas: 50,
    activeQuotas: 50,
    pendingQuotas: 0,
    totalInvested: 50000,
    currentValue: 65000,
    lastPurchaseDate: '2024-01-15T10:35:00Z',
  },
  {
    userId: 'user-003',
    totalQuotas: 30,
    activeQuotas: 30,
    pendingQuotas: 0,
    totalInvested: 30000,
    currentValue: 38500,
    lastPurchaseDate: '2024-02-01T08:05:00Z',
  },
  {
    userId: 'user-004',
    totalQuotas: 10,
    activeQuotas: 10,
    pendingQuotas: 0,
    totalInvested: 10000,
    currentValue: 12000,
    lastPurchaseDate: '2024-02-10T14:25:00Z',
  },
  {
    userId: 'user-005',
    totalQuotas: 25,
    activeQuotas: 25,
    pendingQuotas: 0,
    totalInvested: 25000,
    currentValue: 31200,
    lastPurchaseDate: '2024-02-20T09:20:00Z',
  },
];

// Helper functions
export function getTransactionsByUser(userId: string): QuotaTransaction[] {
  return mockQuotaTransactions.filter((t) => t.userId === userId);
}

export function getBalanceByUser(userId: string): UserQuotaBalance | undefined {
  return mockUserBalances.find((b) => b.userId === userId);
}

export function getTransactionsByMonth(month: string): QuotaTransaction[] {
  return mockQuotaTransactions.filter((t) => t.referenceMonth === month);
}

export function getPendingTransactions(): QuotaTransaction[] {
  return mockQuotaTransactions.filter((t) => t.status === 'pending');
}

export function calculateTotalInvested(): number {
  return mockUserBalances.reduce((sum, b) => sum + b.totalInvested, 0);
}

export function calculateTotalQuotas(): number {
  return mockUserBalances.reduce((sum, b) => sum + b.totalQuotas, 0);
}
