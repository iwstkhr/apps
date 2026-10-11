import { RETENTION_MONTHS } from '@tsudou/shared/limits';

/** Retention deadline (UNIX epoch seconds). Stored in seconds, not milliseconds. */
export function expiresAtFrom(from: Date = new Date()): number {
  const expiry = new Date(from);
  expiry.setMonth(expiry.getMonth() + RETENTION_MONTHS);
  return Math.floor(expiry.getTime() / 1000);
}

/**
 * Expired records are deleted by a once-a-day Cron Trigger (deleteExpired in d1-repository.ts),
 * so they can still be read for up to about a day past the deadline. The app also treats expired records as "nonexistent".
 */
export function isExpired(expiresAt: number | null | undefined, now: number = Date.now()): boolean {
  if (expiresAt == null) return false;
  return expiresAt * 1000 <= now;
}
