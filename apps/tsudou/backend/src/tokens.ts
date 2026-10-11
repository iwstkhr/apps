import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * The event ID in the shared URL. Knowing the URL itself grants read access,
 * so instead of sequential or short IDs, 128 bits of randomness encoded as 22 base64url characters are used.
 */
export function generateEventId(): string {
  return randomBytes(16).toString('base64url');
}

/** Manage token / response edit key. 256 bits. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Identifier of a candidate date. It only needs to be unique within the event, so it can be short. */
export function generateCandidateId(): string {
  return randomBytes(8).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Compare a raw token with a stored hash.
 * To avoid returning early on a length difference, always compare fixed-length hashes.
 */
export function verifyToken(
  token: string | null | undefined,
  expectedHash: string | null | undefined,
): boolean {
  if (!token || !expectedHash) return false;

  const actual = Buffer.from(hashToken(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
