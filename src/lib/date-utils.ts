const CITI_VALIDITY_YEARS = 3;

/** Calculate expiration date (3 years from completion) */
export function calculateExpirationDate(completionDate: string): string {
  const date = new Date(completionDate);
  date.setFullYear(date.getFullYear() + CITI_VALIDITY_YEARS);
  return date.toISOString().split('T')[0];
}

/** Check if a training has expired as of the given date */
export function isTrainingExpired(expirationDate: string, asOf: Date = new Date()): boolean {
  const expiry = new Date(expirationDate);
  return asOf > expiry;
}

/** Check if training was completed today (nightly sync hasn't run yet) */
export function isCompletedToday(completionDate: string, asOf: Date = new Date()): boolean {
  const completed = new Date(completionDate);
  return (
    completed.getFullYear() === asOf.getFullYear() &&
    completed.getMonth() === asOf.getMonth() &&
    completed.getDate() === asOf.getDate()
  );
}

/** Days until expiration (negative if already expired) */
export function daysUntilExpiration(expirationDate: string, asOf: Date = new Date()): number {
  const expiry = new Date(expirationDate);
  const diffMs = expiry.getTime() - asOf.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/** Format a date for display */
export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
