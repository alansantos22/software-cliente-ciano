import {
  generateRandomCode,
  formatBRL,
  getCurrentPeriod,
  periodToDate,
  isWithinDays,
} from './helpers';

describe('generateRandomCode', () => {
  it('should return a string of the specified length', () => {
    expect(generateRandomCode(6)).toHaveLength(6);
    expect(generateRandomCode(8)).toHaveLength(8);
    expect(generateRandomCode(12)).toHaveLength(12);
  });

  it('should default to length 8', () => {
    expect(generateRandomCode()).toHaveLength(8);
  });

  it('should only contain uppercase letters and digits', () => {
    const code = generateRandomCode(20);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it('should generate different values on repeated calls', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateRandomCode(6)));
    // With 36^6 possibilities, all 20 should be unique
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('formatBRL', () => {
  it('should format zero correctly', () => {
    expect(formatBRL(0)).toContain('0');
  });

  it('should format positive values in BRL currency', () => {
    const formatted = formatBRL(1234.56);
    expect(formatted).toContain('1.234,56');
    expect(formatted).toContain('R$');
  });

  it('should format large values', () => {
    const formatted = formatBRL(1000000);
    expect(formatted).toContain('1.000.000');
  });
});

describe('getCurrentPeriod', () => {
  it('should return format YYYY-MM', () => {
    const period = getCurrentPeriod();
    expect(period).toMatch(/^\d{4}-\d{2}$/);
  });

  it('should return the correct period for a given date', () => {
    const date = new Date(2025, 0, 15); // January 2025
    expect(getCurrentPeriod(date)).toBe('2025-01');
  });

  it('should pad single-digit months with zero', () => {
    const date = new Date(2025, 8, 1); // September 2025
    expect(getCurrentPeriod(date)).toBe('2025-09');
  });

  it('should handle December correctly', () => {
    const date = new Date(2025, 11, 31); // December 2025
    expect(getCurrentPeriod(date)).toBe('2025-12');
  });
});

describe('periodToDate', () => {
  it('should return the first day of the month', () => {
    const date = periodToDate('2025-03');
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(2); // March (0-indexed)
    expect(date.getDate()).toBe(1);
  });

  it('should handle January correctly', () => {
    const date = periodToDate('2024-01');
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(0);
  });

  it('should handle December correctly', () => {
    const date = periodToDate('2024-12');
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(11);
  });
});

describe('isWithinDays', () => {
  it('should return true for a date today', () => {
    expect(isWithinDays(new Date(), 1)).toBe(true);
  });

  it('should return true for a date within the range', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    expect(isWithinDays(threeDaysAgo, 7)).toBe(true);
  });

  it('should return false for a date outside the range', () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    expect(isWithinDays(tenDaysAgo, 7)).toBe(false);
  });

  it('should return true for dates in the future (negative diff makes daysDiff <= N)', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    // The function computes (now - future) which is negative, so daysDiff <= N is true
    expect(isWithinDays(tomorrow, 1)).toBe(true);
  });
});
