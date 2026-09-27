import { describe, expect, it } from 'vitest';
import { AppError } from './errors';
import {
  type Candidate,
  LIMITS,
  normalizeOptionalText,
  reconcileChoices,
  validateCandidates,
  validateChoices,
  validateFee,
  validateName,
  validateTitle,
} from './validate';

const iso = (y: number, m: number, d: number, h: number) =>
  new Date(Date.UTC(y, m - 1, d, h)).toISOString();

describe('validateTitle / validateName', () => {
  it('前後の空白を落とす', () => {
    expect(validateTitle('  新年会  ')).toBe('新年会');
    expect(validateName(' 山田 ')).toBe('山田');
  });

  it('空文字を拒否する', () => {
    expect(() => validateTitle('   ')).toThrow(AppError);
    expect(() => validateName('')).toThrow(/お名前/);
  });

  it('上限を超える長さを拒否する', () => {
    expect(() => validateTitle('あ'.repeat(LIMITS.titleMax + 1))).toThrow(/100文字/);
    expect(validateTitle('あ'.repeat(LIMITS.titleMax))).toHaveLength(LIMITS.titleMax);
  });
});

describe('normalizeOptionalText', () => {
  it('空白のみなら null にする', () => {
    expect(normalizeOptionalText('   ', 100, 'メモ')).toBeNull();
    expect(normalizeOptionalText(null, 100, 'メモ')).toBeNull();
    expect(normalizeOptionalText(undefined, 100, 'メモ')).toBeNull();
  });

  it('上限超過を拒否する', () => {
    expect(() => normalizeOptionalText('a'.repeat(11), 10, 'メモ')).toThrow(/10文字/);
  });
});

describe('validateFee', () => {
  it('null と 0 を許容する', () => {
    expect(validateFee(null)).toBeNull();
    expect(validateFee(undefined)).toBeNull();
    expect(validateFee(0)).toBe(0);
  });

  it('負数・小数・上限超過を拒否する', () => {
    expect(() => validateFee(-1)).toThrow(AppError);
    expect(() => validateFee(1.5)).toThrow(/整数/);
    expect(() => validateFee(LIMITS.feeMax + 1)).toThrow(AppError);
  });
});

describe('validateCandidates', () => {
  it('空を拒否する', () => {
    expect(() => validateCandidates([])).toThrow(/1つ以上/);
    expect(() => validateCandidates(null)).toThrow(AppError);
  });

  it('件数上限を超えたら拒否する', () => {
    const many = Array.from({ length: LIMITS.candidatesMax + 1 }, (_, i) => ({
      startAt: iso(2026, 10, 1, i % 24),
    }));
    expect(() => validateCandidates(many)).toThrow(/30件/);
  });

  it('id が無ければ採番し、あれば維持する', () => {
    const result = validateCandidates([
      { startAt: iso(2026, 10, 3, 10) },
      { id: 'keep', startAt: iso(2026, 10, 4, 10) },
    ]);
    expect(result[0]!.id).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(result[1]!.id).toBe('keep');
  });

  it('開始日時の昇順に並べ替える', () => {
    const result = validateCandidates([
      { id: 'b', startAt: iso(2026, 10, 5, 10) },
      { id: 'a', startAt: iso(2026, 10, 3, 10) },
    ]);
    expect(result.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('同じ日時の重複を拒否する', () => {
    expect(() =>
      validateCandidates([{ startAt: iso(2026, 10, 3, 10) }, { startAt: iso(2026, 10, 3, 10) }]),
    ).toThrow(/重複/);
  });

  it('id の重複を拒否する', () => {
    expect(() =>
      validateCandidates([
        { id: 'same', startAt: iso(2026, 10, 3, 10) },
        { id: 'same', startAt: iso(2026, 10, 4, 10) },
      ]),
    ).toThrow(/識別子が重複/);
  });

  it('不正な日時を拒否する', () => {
    expect(() => validateCandidates([{ startAt: 'not-a-date' }])).toThrow(/形式/);
  });

  it('rejectPast のときだけ現在より前の日時を拒否する', () => {
    const now = Date.parse(iso(2030, 1, 1, 10));
    const past = [{ startAt: iso(2030, 1, 1, 9) }];

    expect(() => validateCandidates(past, { rejectPast: true, now })).toThrow(/過去/);
    expect(validateCandidates(past, { now })).toHaveLength(1);
    // ちょうど現在は過去ではない
    expect(
      validateCandidates([{ startAt: iso(2030, 1, 1, 10) }], { rejectPast: true, now }),
    ).toHaveLength(1);
  });
});

describe('validateChoices', () => {
  const candidates: Candidate[] = [
    { id: 'c1', startAt: iso(2026, 10, 3, 10) },
    { id: 'c2', startAt: iso(2026, 10, 4, 10) },
  ];

  it('候補順に並べ替えて返す', () => {
    const result = validateChoices(
      [
        { candidateId: 'c2', status: 'NO' },
        { candidateId: 'c1', status: 'YES' },
      ],
      candidates,
    );
    expect(result).toEqual([
      { candidateId: 'c1', status: 'YES' },
      { candidateId: 'c2', status: 'NO' },
    ]);
  });

  it('回答が足りなければ拒否する', () => {
    expect(() => validateChoices([{ candidateId: 'c1', status: 'YES' }], candidates)).toThrow(
      /すべての候補/,
    );
  });

  it('存在しない候補への回答を拒否する', () => {
    expect(() =>
      validateChoices(
        [
          { candidateId: 'c1', status: 'YES' },
          { candidateId: 'c2', status: 'YES' },
          { candidateId: 'ghost', status: 'YES' },
        ],
        candidates,
      ),
    ).toThrow(/存在しない候補/);
  });

  it('不正な状態を拒否する', () => {
    expect(() =>
      // @ts-expect-error 壊れた入力を意図的に渡す
      validateChoices([{ candidateId: 'c1', status: 'PROBABLY' }], candidates),
    ).toThrow(/回答の値/);
  });

  it('同じ候補への重複回答を拒否する', () => {
    expect(() =>
      validateChoices(
        [
          { candidateId: 'c1', status: 'YES' },
          { candidateId: 'c1', status: 'NO' },
        ],
        candidates,
      ),
    ).toThrow(/重複/);
  });
});

describe('reconcileChoices', () => {
  it('消えた候補を落とし、増えた候補を未定で埋める', () => {
    const next: Candidate[] = [
      { id: 'c1', startAt: iso(2026, 10, 3, 10) },
      { id: 'c3', startAt: iso(2026, 10, 5, 10) },
    ];
    const result = reconcileChoices(
      [
        { candidateId: 'c1', status: 'YES' },
        { candidateId: 'c2', status: 'NO' },
      ],
      next,
    );

    expect(result).toEqual([
      { candidateId: 'c1', status: 'YES' },
      { candidateId: 'c3', status: 'MAYBE' },
    ]);
  });
});
