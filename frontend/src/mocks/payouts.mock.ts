// ========================================
// MOCK: Payouts - Sistema de Cotas Ciano
// ========================================

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface PayoutRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  pixKey: string;
  pixKeyType: 'cpf' | 'email' | 'phone' | 'random';
  status: PayoutStatus;
  referenceMonth: string; // YYYY-MM
  requestedAt: string;
  processedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
  transactionId: string | null;
}

export interface MonthlyPayoutSummary {
  month: string;
  totalRequested: number;
  totalPaid: number;
  totalPending: number;
  requestCount: number;
  paidCount: number;
  pendingCount: number;
  averageAmount: number;
}

// Sample payout requests
export const mockPayouts: PayoutRequest[] = [
  // Completed payouts
  {
    id: 'payout-001',
    userId: 'user-002',
    userName: 'João Silva',
    amount: 10000,
    pixKey: 'joao.silva@email.com',
    pixKeyType: 'email',
    status: 'completed',
    referenceMonth: '2024-03',
    requestedAt: '2024-03-25T14:00:00Z',
    processedAt: '2024-03-26T09:00:00Z',
    completedAt: '2024-03-26T10:00:00Z',
    failureReason: null,
    transactionId: 'TXN-ABC123456',
  },
  {
    id: 'payout-002',
    userId: 'user-003',
    userName: 'Maria Santos',
    amount: 5000,
    pixKey: '11977776666',
    pixKeyType: 'phone',
    status: 'completed',
    referenceMonth: '2024-03',
    requestedAt: '2024-03-28T10:30:00Z',
    processedAt: '2024-03-29T09:00:00Z',
    completedAt: '2024-03-29T09:15:00Z',
    failureReason: null,
    transactionId: 'TXN-DEF789012',
  },
  {
    id: 'payout-003',
    userId: 'user-005',
    userName: 'Ana Costa',
    amount: 3000,
    pixKey: '33344455566',
    pixKeyType: 'cpf',
    status: 'completed',
    referenceMonth: '2024-03',
    requestedAt: '2024-03-30T16:45:00Z',
    processedAt: '2024-03-31T09:00:00Z',
    completedAt: '2024-03-31T09:10:00Z',
    failureReason: null,
    transactionId: 'TXN-GHI345678',
  },
  // Processing payouts
  {
    id: 'payout-004',
    userId: 'user-011',
    userName: 'Marcos Souza',
    amount: 8000,
    pixKey: 'marcos@email.com',
    pixKeyType: 'email',
    status: 'processing',
    referenceMonth: '2024-04',
    requestedAt: '2024-04-05T11:00:00Z',
    processedAt: '2024-04-05T14:00:00Z',
    completedAt: null,
    failureReason: null,
    transactionId: null,
  },
  // Pending payouts
  {
    id: 'payout-005',
    userId: 'user-012',
    userName: 'Júlia Martins',
    amount: 2500,
    pixKey: '00011122233',
    pixKeyType: 'cpf',
    status: 'pending',
    referenceMonth: '2024-04',
    requestedAt: '2024-04-06T09:30:00Z',
    processedAt: null,
    completedAt: null,
    failureReason: null,
    transactionId: null,
  },
  {
    id: 'payout-006',
    userId: 'user-006',
    userName: 'Pedro Alves',
    amount: 1800,
    pixKey: 'pedro.alves@email.com',
    pixKeyType: 'email',
    status: 'pending',
    referenceMonth: '2024-04',
    requestedAt: '2024-04-06T14:15:00Z',
    processedAt: null,
    completedAt: null,
    failureReason: null,
    transactionId: null,
  },
  // Failed payout example
  {
    id: 'payout-007',
    userId: 'user-004',
    userName: 'Carlos Lima',
    amount: 1500,
    pixKey: 'chave-invalida-123',
    pixKeyType: 'random',
    status: 'failed',
    referenceMonth: '2024-03',
    requestedAt: '2024-03-20T08:00:00Z',
    processedAt: '2024-03-20T10:00:00Z',
    completedAt: null,
    failureReason: 'Chave PIX inválida ou não encontrada',
    transactionId: null,
  },
  // Historical payouts
  {
    id: 'payout-008',
    userId: 'user-002',
    userName: 'João Silva',
    amount: 7500,
    pixKey: 'joao.silva@email.com',
    pixKeyType: 'email',
    status: 'completed',
    referenceMonth: '2024-02',
    requestedAt: '2024-02-25T15:00:00Z',
    processedAt: '2024-02-26T09:00:00Z',
    completedAt: '2024-02-26T09:30:00Z',
    failureReason: null,
    transactionId: 'TXN-JKL901234',
  },
  {
    id: 'payout-009',
    userId: 'user-001',
    userName: 'Administrador Master',
    amount: 25000,
    pixKey: 'admin@ciano.com',
    pixKeyType: 'email',
    status: 'completed',
    referenceMonth: '2024-03',
    requestedAt: '2024-03-31T18:00:00Z',
    processedAt: '2024-04-01T09:00:00Z',
    completedAt: '2024-04-01T09:05:00Z',
    failureReason: null,
    transactionId: 'TXN-MNO567890',
  },
];

// Monthly summaries
export const mockPayoutSummaries: MonthlyPayoutSummary[] = [
  {
    month: '2024-04',
    totalRequested: 12300,
    totalPaid: 0,
    totalPending: 12300,
    requestCount: 3,
    paidCount: 0,
    pendingCount: 3,
    averageAmount: 4100,
  },
  {
    month: '2024-03',
    totalRequested: 44500,
    totalPaid: 43000,
    totalPending: 0,
    requestCount: 5,
    paidCount: 4,
    pendingCount: 0,
    averageAmount: 8900,
  },
  {
    month: '2024-02',
    totalRequested: 7500,
    totalPaid: 7500,
    totalPending: 0,
    requestCount: 1,
    paidCount: 1,
    pendingCount: 0,
    averageAmount: 7500,
  },
];

// Helper functions
export function getPayoutsByUser(userId: string): PayoutRequest[] {
  return mockPayouts.filter((p) => p.userId === userId);
}

export function getPayoutsByMonth(month: string): PayoutRequest[] {
  return mockPayouts.filter((p) => p.referenceMonth === month);
}

export function getPayoutsByStatus(status: PayoutStatus): PayoutRequest[] {
  return mockPayouts.filter((p) => p.status === status);
}

export function getPendingPayouts(): PayoutRequest[] {
  return mockPayouts.filter((p) => p.status === 'pending' || p.status === 'processing');
}

export function getPayoutSummary(month: string): MonthlyPayoutSummary | undefined {
  return mockPayoutSummaries.find((s) => s.month === month);
}

export function calculateUserPayoutTotal(userId: string): number {
  return mockPayouts
    .filter((p) => p.userId === userId && p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);
}

export function getRecentPayouts(limit: number = 10): PayoutRequest[] {
  return [...mockPayouts]
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
    .slice(0, limit);
}
