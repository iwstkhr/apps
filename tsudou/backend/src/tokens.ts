import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * 共有 URL に載るイベント ID。URL を知っていること自体が閲覧権限なので、
 * 連番や短い ID ではなく 128bit の乱数を base64url で 22 文字にして使う。
 */
export function generateEventId(): string {
  return randomBytes(16).toString('base64url');
}

/** 管理トークン / 回答編集キー。256bit。 */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** 候補日時の識別子。イベント内で一意であればよいので短くてよい。 */
export function generateCandidateId(): string {
  return randomBytes(8).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * 生のトークンと保存済みハッシュを比較する。
 * 長さの違いで早期 return しないよう、常にハッシュ同士を固定長で比較する。
 */
export function verifyToken(
  token: string | null | undefined,
  expectedHash: string | null | undefined,
): boolean {
  if (!token || !expectedHash) return false;

  const actual = Buffer.from(hashToken(token), 'hex');
  let expected: Buffer;
  try {
    expected = Buffer.from(expectedHash, 'hex');
  } catch {
    return false;
  }

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
