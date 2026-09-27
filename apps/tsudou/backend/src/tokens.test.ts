import { describe, expect, it } from 'vitest';
import {
  generateCandidateId,
  generateEventId,
  generateToken,
  hashToken,
  verifyToken,
} from './tokens';

describe('generateEventId', () => {
  it('URL に載せられる 22 文字の文字列を返す', () => {
    const id = generateEventId();
    expect(id).toHaveLength(22);
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('毎回異なる値を返す', () => {
    const ids = new Set(Array.from({ length: 1000 }, generateEventId));
    expect(ids.size).toBe(1000);
  });
});

describe('generateToken / generateCandidateId', () => {
  it('トークンは十分に長い', () => {
    expect(generateToken().length).toBeGreaterThanOrEqual(43);
  });

  it('候補 ID も一意になる', () => {
    const ids = new Set(Array.from({ length: 1000 }, generateCandidateId));
    expect(ids.size).toBe(1000);
  });
});

describe('verifyToken', () => {
  it('正しいトークンを受け入れる', () => {
    const token = generateToken();
    expect(verifyToken(token, hashToken(token))).toBe(true);
  });

  it('異なるトークンを拒否する', () => {
    expect(verifyToken(generateToken(), hashToken(generateToken()))).toBe(false);
  });

  it('null / 空文字を拒否する', () => {
    const hash = hashToken('x');
    expect(verifyToken(null, hash)).toBe(false);
    expect(verifyToken('', hash)).toBe(false);
    expect(verifyToken('x', null)).toBe(false);
    expect(verifyToken('x', '')).toBe(false);
  });

  it('hex でないハッシュを拒否する', () => {
    expect(verifyToken('x', 'これは hex ではない')).toBe(false);
  });

  it('ハッシュは決定的で、16進64文字になる', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/);
  });
});
