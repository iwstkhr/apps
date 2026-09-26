import { LIMITS } from '@tsudou/shared/limits';
import { describe, expect, it } from 'vitest';
import type { CandidateDraft } from './candidateDraft';
import {
  parseFeeValue,
  validateCandidateRow,
  validateCandidatesValue,
  validateFeeValue,
  validateMemoValue,
  validateNameValue,
  validateTitleValue,
} from './formValidators';

const row = (value: string): CandidateDraft => ({ id: null, value });

describe('validateTitleValue / validateNameValue', () => {
  it('入力があれば通す', () => {
    expect(validateTitleValue('新年会')).toBeUndefined();
    expect(validateNameValue('山田')).toBeUndefined();
  });

  it('空白のみを拒否する', () => {
    expect(validateTitleValue('   ')).toMatch(/イベント名/);
    expect(validateNameValue('')).toMatch(/お名前/);
  });

  it('上限ちょうどは通し、超えたら拒否する', () => {
    expect(validateTitleValue('あ'.repeat(LIMITS.titleMax))).toBeUndefined();
    expect(validateTitleValue('あ'.repeat(LIMITS.titleMax + 1))).toMatch(/100文字/);
  });
});

describe('validateMemoValue', () => {
  it('空欄を許容する', () => {
    expect(validateMemoValue('')).toBeUndefined();
  });

  it('上限を超えたら拒否する', () => {
    expect(validateMemoValue('あ'.repeat(LIMITS.memoMax + 1))).toMatch(/2000文字/);
  });
});

describe('validateFeeValue', () => {
  it('空欄は未設定として許容する', () => {
    expect(validateFeeValue('')).toBeUndefined();
    expect(validateFeeValue('  ')).toBeUndefined();
  });

  it('0 と上限ちょうどを許容する', () => {
    expect(validateFeeValue('0')).toBeUndefined();
    expect(validateFeeValue(String(LIMITS.feeMax))).toBeUndefined();
  });

  it('上限を超えたら拒否する (サーバ側の上限と一致)', () => {
    expect(validateFeeValue(String(LIMITS.feeMax + 1))).toMatch(/以下/);
  });

  it('数字以外・小数・負数を拒否する', () => {
    expect(validateFeeValue('3,000')).toMatch(/整数/);
    expect(validateFeeValue('1.5')).toMatch(/整数/);
    expect(validateFeeValue('-1')).toMatch(/整数/);
    expect(validateFeeValue('むりょう')).toMatch(/整数/);
  });
});

describe('parseFeeValue', () => {
  it('空欄は null、数値はそのまま', () => {
    expect(parseFeeValue('')).toBeNull();
    expect(parseFeeValue('  ')).toBeNull();
    expect(parseFeeValue('0')).toBe(0);
    expect(parseFeeValue(' 3000 ')).toBe(3000);
  });
});

describe('validateCandidateRow', () => {
  it('正しい日時を通す', () => {
    expect(validateCandidateRow(row('2026-10-03T19:00'))).toBeUndefined();
  });

  it('未入力と不正な形式を区別する', () => {
    expect(validateCandidateRow(row(''))).toMatch(/入力/);
    expect(validateCandidateRow(row('not-a-date'))).toMatch(/形式/);
  });

  it('rejectPast のときだけ現在より前の日時を拒否する', () => {
    const now = new Date(2030, 0, 1, 19, 0).getTime();
    expect(validateCandidateRow(row('2030-01-01T18:59'), { rejectPast: true, now })).toMatch(
      /過去/,
    );
    expect(
      validateCandidateRow(row('2030-01-01T19:00'), { rejectPast: true, now }),
    ).toBeUndefined();
    expect(validateCandidateRow(row('2030-01-01T18:59'), { now })).toBeUndefined();
  });
});

describe('validateCandidatesValue', () => {
  it('正しい候補列を通す', () => {
    expect(
      validateCandidatesValue([row('2026-10-03T19:00'), row('2026-10-04T19:00')]),
    ).toBeUndefined();
  });

  it('空を拒否する', () => {
    expect(validateCandidatesValue([])).toMatch(/1つ以上/);
  });

  it('件数上限を超えたら拒否する', () => {
    const many = Array.from({ length: LIMITS.candidatesMax + 1 }, (_, i) =>
      row(`2026-10-${String((i % 28) + 1).padStart(2, '0')}T19:00`),
    );
    expect(validateCandidatesValue(many)).toMatch(/30件/);
  });

  it('未入力の行があれば拒否する', () => {
    expect(validateCandidatesValue([row('2026-10-03T19:00'), row('')])).toMatch(/入力されていない/);
  });

  it('過去の候補があれば、未入力より先にその旨を伝える', () => {
    const rules = { rejectPast: true, now: new Date(2030, 0, 1, 19, 0).getTime() };
    expect(
      validateCandidatesValue([row('2029-12-31T19:00'), row(''), row('2030-01-02T19:00')], rules),
    ).toMatch(/過去/);
    expect(validateCandidatesValue([row('2030-01-02T19:00')], rules)).toBeUndefined();
  });

  it('同じ日時の重複を拒否する (サーバに弾かれる前に気づかせる)', () => {
    expect(validateCandidatesValue([row('2026-10-03T19:00'), row('2026-10-03T19:00')])).toMatch(
      /重複/,
    );
  });
});
