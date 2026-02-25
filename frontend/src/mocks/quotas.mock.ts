// ========================================
// MOCK: Quotas - Sistema de Cotas Ciano
// ========================================

export interface QuotaConfig {
  minPurchase: number;
  maxPurchase: number;
  quotaPrice: number;
  currency: string;
  // Bonus percentages
  firstPurchaseBonus: number; // 10% sobre primeira compra do indicado
  repurchaseBonusL1: number; // 5% nível 1
  repurchaseBonusL2to6: number; // 2% níveis 2-6
  teamBonusPercent: number; // 2% do total da equipe
  leadershipBonusOuro: number; // 1%
  leadershipBonusDiamante: number; // 2%
  dividendPoolPercent: number; // 20% do lucro
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
  /**
   * Cotas compradas diretamente pelo usuário.
   * ⚠️ REGRA DO SISTEMA: apenas estas contam para subir de nível.
   */
  purchasedQuotas: number;
  /**
   * Cotas recebidas via split (bônus em cotas).
   * ⚠️ REGRA DO SISTEMA: não contam para nível, apenas para dividendos.
   */
  splitQuotas: number;
  /**
   * Total de cotas para cálculo de dividendos (purchasedQuotas + splitQuotas).
   * NÃO usar este campo para determinar nível do usuário.
   */
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
  quotaPrice: 2500, // R$ 2.500,00 per quota
  currency: 'BRL',
  // Bonus structure
  firstPurchaseBonus: 10, // 10% sobre primeira compra do indicado
  repurchaseBonusL1: 5, // 5% nível 1
  repurchaseBonusL2to6: 2, // 2% níveis 2-6
  teamBonusPercent: 2, // 2% do total da equipe
  leadershipBonusOuro: 1, // 1% Ouro
  leadershipBonusDiamante: 2, // 2% Diamante
  dividendPoolPercent: 20, // 20% do lucro ÷ total cotas × suas cotas
};

// Sample transactions
export const mockQuotaTransactions: QuotaTransaction[] = [
  // User 002 - João Silva
  {
    id: 'txn-001',
    userId: 'user-002',
    type: 'purchase',
    amount: 125000,
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
    amount: 75000,
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
    amount: 62500,
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
    amount: 12500,
    quotasAffected: 5,
    description: 'Compra adicional de cotas',
    status: 'pending',
    createdAt: '2024-04-01T09:00:00Z',
    completedAt: null,
    referenceMonth: '2024-04',
  },
];

// User balances
// ⚠️ REGRA DO SISTEMA:
//   purchasedQuotas → contam para NÍVEL do usuário
//   splitQuotas     → contam apenas para DIVIDENDOS (não sobem de nível)
//   totalQuotas     → purchasedQuotas + splitQuotas (base de cálculo de dividendos)
export const mockUserBalances: UserQuotaBalance[] = [
  {
    userId: 'user-001',
    purchasedQuotas: 100, // Imperial (≥60 compradas)
    splitQuotas: 15,
    totalQuotas: 115,
    activeQuotas: 115,
    pendingQuotas: 0,
    totalInvested: 250000,
    currentValue: 375000,
    lastPurchaseDate: '2024-01-01T00:00:00Z',
  },
  {
    userId: 'user-002',
    purchasedQuotas: 50, // VIP (≥20 compradas)
    splitQuotas: 7,
    totalQuotas: 57,
    activeQuotas: 57,
    pendingQuotas: 0,
    totalInvested: 125000,
    currentValue: 162500,
    lastPurchaseDate: '2024-01-15T10:35:00Z',
  },
  {
    userId: 'user-003',
    purchasedQuotas: 30, // Platinum (≥10 compradas)
    splitQuotas: 4,
    totalQuotas: 34,
    activeQuotas: 34,
    pendingQuotas: 0,
    totalInvested: 75000,
    currentValue: 96250,
    lastPurchaseDate: '2024-02-01T08:05:00Z',
  },
  {
    userId: 'user-004',
    purchasedQuotas: 10, // Platinum (≥10 compradas)
    splitQuotas: 2,
    totalQuotas: 12,
    activeQuotas: 12,
    pendingQuotas: 0,
    totalInvested: 25000,
    currentValue: 30000,
    lastPurchaseDate: '2024-02-10T14:25:00Z',
  },
  {
    userId: 'user-005',
    purchasedQuotas: 25, // VIP (≥20 compradas)
    splitQuotas: 3,
    totalQuotas: 28,
    activeQuotas: 28,
    pendingQuotas: 0,
    totalInvested: 62500,
    currentValue: 78000,
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

/** Total de cotas compradas — base para cálculo de nível de todos os usuários. */
export function calculateTotalPurchasedQuotas(): number {
  return mockUserBalances.reduce((sum, b) => sum + b.purchasedQuotas, 0);
}

/** Total de cotas (compradas + split) — base para distribuição de dividendos. */
export function calculateTotalQuotasForDividends(): number {
  return mockUserBalances.reduce((sum, b) => sum + b.totalQuotas, 0);
}

/** @deprecated Use calculateTotalPurchasedQuotas() or calculateTotalQuotasForDividends() */
export function calculateTotalQuotas(): number {
  return calculateTotalQuotasForDividends();
}
