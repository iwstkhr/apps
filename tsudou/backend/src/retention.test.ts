import { RETENTION_MONTHS } from '@tsudou/shared/limits';
import { describe, expect, it } from 'vitest';
import { expiresAtFrom, isExpired } from './retention';

describe('expiresAtFrom', () => {
  it('3ヶ月後のエポック秒を返す', () => {
    const from = new Date('2026-09-20T10:00:00.000Z');
    const expiry = new Date(expiresAtFrom(from) * 1000);

    expect(RETENTION_MONTHS).toBe(3);
    expect(expiry.toISOString()).toBe('2026-12-20T10:00:00.000Z');
  });

  it('年をまたぐ', () => {
    const expiry = new Date(expiresAtFrom(new Date('2026-11-15T00:00:00.000Z')) * 1000);
    expect(expiry.toISOString()).toBe('2027-02-15T00:00:00.000Z');
  });

  it('ミリ秒ではなく秒の整数を返す', () => {
    const from = new Date('2026-09-20T10:00:00.500Z');
    const value = expiresAtFrom(from);

    expect(Number.isInteger(value)).toBe(true);
    // ミリ秒で返していれば from.getTime() と同じ桁数になる
    expect(value).toBe(Math.floor(Date.parse('2026-12-20T10:00:00.500Z') / 1000));
  });
});

describe('isExpired', () => {
  const now = Date.parse('2026-09-20T10:00:00.000Z');

  it('期限前は false', () => {
    expect(isExpired(Math.floor(now / 1000) + 60, now)).toBe(false);
  });

  it('期限ちょうど・経過後は true', () => {
    expect(isExpired(Math.floor(now / 1000), now)).toBe(true);
    expect(isExpired(Math.floor(now / 1000) - 60, now)).toBe(true);
  });

  it('未設定 (旧データ) は期限切れ扱いにしない', () => {
    expect(isExpired(null, now)).toBe(false);
    expect(isExpired(undefined, now)).toBe(false);
  });
});
