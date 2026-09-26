import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatExpiry,
  formatFee,
  formatTime,
  fromDateTimeLocal,
  toDateTimeLocal,
} from './format';

/** ローカルタイムで組み立てる (テスト環境の TZ に依存しないようにするため) */
const local = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(y, m - 1, d, h, min).toISOString();

describe('formatDateTime', () => {
  it('曜日付きで整形する', () => {
    // 2026-10-03 は土曜日
    expect(formatDateTime(local(2026, 10, 3, 19, 0), { withYear: false })).toBe('10/3(土) 19:00');
  });

  it('withYear で年を付ける', () => {
    expect(formatDateTime(local(2026, 10, 3, 19, 0), { withYear: true })).toBe(
      '2026/10/3(土) 19:00',
    );
  });

  it('1桁の時刻を0埋めする', () => {
    expect(formatDateTime(local(2026, 1, 5, 9, 5), { withYear: false })).toBe('1/5(月) 09:05');
  });

  it('不正な日時でも落ちない', () => {
    expect(formatDateTime('まったく日付ではない')).toBe('(不正な日時)');
  });
});

describe('formatDate / formatTime', () => {
  it('日付と時刻を分けて返す', () => {
    const iso = local(2026, 12, 31, 23, 59);
    expect(formatDate(iso)).toBe('12/31(木)');
    expect(formatTime(iso)).toBe('23:59');
  });

  it('不正な値でもプレースホルダを返す', () => {
    expect(formatDate('x')).toBe('--');
    expect(formatTime('x')).toBe('--:--');
  });
});

describe('formatFee', () => {
  it('null は未設定', () => {
    expect(formatFee(null)).toBe('未設定');
    expect(formatFee(undefined)).toBe('未設定');
  });

  it('0 は無料', () => {
    expect(formatFee(0)).toBe('無料');
  });

  it('3桁区切りで表示する', () => {
    expect(formatFee(3000)).toBe('¥3,000');
    expect(formatFee(1234567)).toBe('¥1,234,567');
  });
});

describe('datetime-local との相互変換', () => {
  it('ISO → datetime-local → ISO で元に戻る', () => {
    const iso = local(2026, 10, 3, 19, 30);
    const value = toDateTimeLocal(iso);
    expect(value).toBe('2026-10-03T19:30');
    expect(fromDateTimeLocal(value)).toBe(iso);
  });

  it('空文字や不正値は null', () => {
    expect(fromDateTimeLocal('')).toBeNull();
    expect(fromDateTimeLocal('not-a-date')).toBeNull();
    expect(toDateTimeLocal('not-a-date')).toBe('');
  });
});

describe('formatExpiry', () => {
  it('エポック秒を年月日にする', () => {
    const epoch = Math.floor(new Date(2026, 11, 20, 10, 0).getTime() / 1000);
    expect(formatExpiry(epoch)).toBe('2026/12/20');
  });

  it('未設定や不正値でもプレースホルダを返す', () => {
    expect(formatExpiry(null)).toBe('--');
    expect(formatExpiry(undefined)).toBe('--');
    expect(formatExpiry(Number.NaN)).toBe('--');
  });
});
