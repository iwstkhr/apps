import { describe, expect, it } from 'vitest';
import {
  candidatesToDrafts,
  candidatesToInput,
  defaultCandidate,
  emptyCandidate,
  nextCandidateAfter,
} from './candidate-draft';

describe('candidatesToInput', () => {
  it('id を保ったまま ISO 文字列に変換する', () => {
    const result = candidatesToInput([{ id: 'c1', value: '2026-10-03T19:00' }]);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('c1');
    expect(new Date(result[0]!.startAt).getHours()).toBe(19);
  });

  it('空や不正な行は捨てる (入力途中の行を送らない)', () => {
    expect(
      candidatesToInput([
        { id: null, value: '' },
        { id: null, value: 'x' },
      ]),
    ).toEqual([]);
  });
});

describe('candidatesToDrafts', () => {
  it('ISO から datetime-local の値に戻す', () => {
    const startAt = new Date(2026, 9, 3, 19, 0).toISOString();
    expect(candidatesToDrafts([{ id: 'c1', startAt }])).toEqual([
      { id: 'c1', value: '2026-10-03T19:00' },
    ]);
  });
});

describe('defaultCandidate', () => {
  it('未来の土曜 19:00 を返す', () => {
    const date = new Date(defaultCandidate().value);
    expect(date.getDay()).toBe(6);
    expect(date.getHours()).toBe(19);
    expect(date.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('nextCandidateAfter', () => {
  it('翌日・同時刻を返す', () => {
    expect(nextCandidateAfter({ id: 'c1', value: '2026-10-03T19:00' })).toEqual({
      id: null,
      value: '2026-10-04T19:00',
    });
  });

  it('月をまたぐ', () => {
    expect(nextCandidateAfter({ id: null, value: '2026-10-31T19:00' }).value).toBe(
      '2026-11-01T19:00',
    );
  });

  it('直前が空なら空の候補を返す', () => {
    expect(nextCandidateAfter(undefined)).toEqual(emptyCandidate());
    expect(nextCandidateAfter({ id: null, value: '' })).toEqual(emptyCandidate());
    expect(nextCandidateAfter({ id: null, value: 'not-a-date' })).toEqual(emptyCandidate());
  });
});
