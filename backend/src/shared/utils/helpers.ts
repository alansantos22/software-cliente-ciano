/**
 * Generate a random alphanumeric string
 * @param length - Length of the string (default: 8)
 * @returns Random alphanumeric string
 */
export function generateRandomCode(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Format currency to BRL
 * @param value - Number value
 * @returns Formatted string
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Get current period in YYYY-MM format
 * @param date - Date object (default: now)
 * @returns Period string
 */
export function getCurrentPeriod(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Parse period string to Date
 * @param period - Period in YYYY-MM format
 * @returns Date object (first day of month)
 */
export function periodToDate(period: string): Date {
  const [year, month] = period.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

/**
 * Check if a date is within the last N days
 * @param date - Date to check
 * @param days - Number of days
 * @returns boolean
 */
export function isWithinDays(date: Date, days: number): boolean {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const daysDiff = diff / (1000 * 60 * 60 * 24);
  return daysDiff <= days;
}
