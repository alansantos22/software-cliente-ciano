// ========================================
// MOCK: Centralized Export & Utilities
// Sistema de Cotas Ciano
// ========================================

// === RE-EXPORTS ===
export * from './users.mock';
export * from './quotas.mock';
export * from './earnings.mock';
export * from './network.mock';
export * from './payouts.mock';
export * from './financial.mock';

// === MOCK UTILITIES ===

/**
 * Simulates API delay for realistic mock behavior
 * @param ms Milliseconds to delay (default: random 200-800ms)
 */
export function mockDelay(ms?: number): Promise<void> {
  const delay = ms ?? Math.floor(Math.random() * 600) + 200;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Wraps data in mock API response format
 */
export interface MockApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  timestamp: string;
}

export function mockResponse<T>(data: T): MockApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    timestamp: new Date().toISOString(),
  };
}

export function mockError(message: string): MockApiResponse<null> {
  return {
    success: false,
    data: null,
    error: message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function paginate<T>(
  items: T[],
  page: number = 1,
  pageSize: number = 10
): PaginatedResponse<T> {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const paginatedItems = items.slice(start, start + pageSize);

  return {
    items: paginatedItems,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Generate random ID
 */
export function generateMockId(prefix: string = 'mock'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Format currency (BRL)
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Format date (Brazilian format)
 */
export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
}

/**
 * Format datetime (Brazilian format)
 */
export function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

/**
 * Get current period in YYYY-MM format
 */
export function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get previous period
 */
export function getPreviousPeriod(period: string): string {
  const parts = period.split('-');
  const year = parseInt(parts[0] ?? '2024');
  const month = parseInt(parts[1] ?? '1');
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// === MOCK AUTH TOKENS ===

export const mockTokens = {
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTAwMSIsIm5hbWUiOiJBZG1pbmlzdHJhZG9yIE1hc3RlciIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcxMjAwMDAwMCwiZXhwIjoxNzEyMDg2NDAwfQ.mock_signature',
  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTAwMSIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzEyMDAwMDAwLCJleHAiOjE3MTI2MDQ4MDB9.mock_refresh_signature',
  expiresIn: 86400, // 24 hours
};

// === TYPE GUARD HELPERS ===

export function isValidUserId(id: string): boolean {
  return /^user-\d{3}$/.test(id);
}

export function isValidPeriod(period: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}
