import { describe, it, expect } from 'vitest';
import {
  calculateExpirationDate,
  isTrainingExpired,
  isCompletedToday,
  daysUntilExpiration,
} from '../src/lib/date-utils';

describe('calculateExpirationDate', () => {
  it('adds the 3-year CITI validity window', () => {
    expect(calculateExpirationDate('2020-01-15')).toBe('2023-01-15');
  });
});

describe('isTrainingExpired', () => {
  it('detects a past expiration date', () => {
    expect(isTrainingExpired('2020-01-01', new Date('2026-01-01T00:00:00Z'))).toBe(true);
  });

  it('treats a future expiration date as current', () => {
    expect(isTrainingExpired('2030-01-01', new Date('2026-01-01T00:00:00Z'))).toBe(false);
  });
});

describe('isCompletedToday', () => {
  it('is true when completion equals the as-of date', () => {
    // Construct as-of from the same string so the comparison is timezone-stable.
    const asOf = new Date('2026-06-04');
    expect(isCompletedToday('2026-06-04', asOf)).toBe(true);
  });

  it('is false for a different calendar day', () => {
    const asOf = new Date('2026-06-04');
    expect(isCompletedToday('2026-06-03', asOf)).toBe(false);
  });
});

describe('daysUntilExpiration', () => {
  it('is negative once expired', () => {
    expect(daysUntilExpiration('2020-01-01', new Date('2026-01-01T00:00:00Z'))).toBeLessThan(0);
  });

  it('is positive while valid', () => {
    expect(daysUntilExpiration('2030-01-01', new Date('2026-01-01T00:00:00Z'))).toBeGreaterThan(0);
  });
});
