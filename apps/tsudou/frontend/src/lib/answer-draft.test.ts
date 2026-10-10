import { describe, expect, it } from 'vitest';
import { draftFromAnswer, draftToChoices, emptyDraft } from './answer-draft';
import type { Candidate } from './types';

const candidates: Candidate[] = [
  { id: 'c1', startAt: '2026-10-03T10:00:00.000Z' },
  { id: 'c2', startAt: '2026-10-04T10:00:00.000Z' },
];

describe('emptyDraft', () => {
  it('全候補を「未定」で埋める', () => {
    expect(emptyDraft(candidates)).toEqual({
      name: '',
      message: '',
      choices: { c1: 'MAYBE', c2: 'MAYBE' },
    });
  });
});

describe('draftFromAnswer', () => {
  it('既存回答を下書きに変換する', () => {
    const draft = draftFromAnswer(candidates, {
      name: '山田',
      message: '遅れます',
      choices: [
        { candidateId: 'c1', status: 'YES' },
        { candidateId: 'c2', status: 'NO' },
      ],
    });

    expect(draft).toEqual({ name: '山田', message: '遅れます', choices: { c1: 'YES', c2: 'NO' } });
  });

  it('回答の無い候補は「未定」で補う (候補が後から増えた場合)', () => {
    const draft = draftFromAnswer(candidates, {
      name: '山田',
      message: null,
      choices: [{ candidateId: 'c1', status: 'YES' }],
    });

    expect(draft.choices).toEqual({ c1: 'YES', c2: 'MAYBE' });
    expect(draft.message).toBe('');
  });
});

describe('draftToChoices', () => {
  it('候補順の配列にして返す', () => {
    const draft = { name: '山田', message: '', choices: { c2: 'NO' as const, c1: 'YES' as const } };
    expect(draftToChoices(candidates, draft)).toEqual([
      { candidateId: 'c1', status: 'YES' },
      { candidateId: 'c2', status: 'NO' },
    ]);
  });

  it('下書きに無い候補は「未定」として送る', () => {
    expect(draftToChoices(candidates, { name: '', message: '', choices: {} })).toEqual([
      { candidateId: 'c1', status: 'MAYBE' },
      { candidateId: 'c2', status: 'MAYBE' },
    ]);
  });
});
