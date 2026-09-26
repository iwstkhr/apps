import { RETENTION_MONTHS } from '@tsudou/shared/limits';

/** 保持期限 (UNIX エポック秒)。ミリ秒ではなく秒で持つ。 */
export function expiresAtFrom(from: Date = new Date()): number {
  const expiry = new Date(from);
  expiry.setMonth(expiry.getMonth() + RETENTION_MONTHS);
  return Math.floor(expiry.getTime() / 1000);
}

/**
 * 期限切れのレコードは 1 日 1 回の Cron Trigger (d1Repository.ts の deleteExpired) で消すので、
 * 期限から最大 1 日ほどは読み取れてしまう。アプリ側でも期限を過ぎたものは「存在しない」として扱う。
 */
export function isExpired(expiresAt: number | null | undefined, now: number = Date.now()): boolean {
  if (expiresAt == null) return false;
  return expiresAt * 1000 <= now;
}
