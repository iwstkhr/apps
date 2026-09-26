import { describe, expect, it } from 'vitest';
import { parseApiError } from './errors';

describe('parseApiError', () => {
  it('既知のコードはそのまま使う', () => {
    const error = parseApiError({
      error: { code: 'VALIDATION', message: 'イベント名を入力してください' },
    });
    expect(error.code).toBe('VALIDATION');
    expect(error.message).toBe('イベント名を入力してください');
  });

  it('未知のコードは INTERNAL として扱い、文言はそのまま残す', () => {
    const error = parseApiError({ error: { code: 'SOMETHING_ELSE', message: '詳細' } });
    expect(error.code).toBe('INTERNAL');
    expect(error.message).toBe('詳細');
  });

  it('想定外の形でも既定の文言を返す', () => {
    // Cloudflare 自体が返すエラーなどはこの形になる
    expect(parseApiError({ message: 'Too Many Requests' }).code).toBe('INTERNAL');
    expect(parseApiError(null).message).toContain('通信に失敗しました');
    expect(parseApiError({ error: { code: 'VALIDATION', message: '' } }).message).toContain(
      '通信に失敗しました',
    );
  });
});
