import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { bestCandidateIds, summarize } from '../lib/tally';
import type { AnswerView, Candidate } from '../lib/types';
import { AnswerGrid } from './AnswerGrid';

const candidates: Candidate[] = [
  { id: 'c1', startAt: new Date(2026, 9, 3, 19, 0).toISOString() },
  { id: 'c2', startAt: new Date(2026, 9, 4, 19, 0).toISOString() },
];

const answer = (
  id: string,
  name: string,
  s1: 'YES' | 'NO' | 'MAYBE',
  s2: 'YES' | 'NO' | 'MAYBE',
): AnswerView => ({
  id,
  name,
  message: null,
  choices: [
    { candidateId: 'c1', status: s1 },
    { candidateId: 'c2', status: s2 },
  ],
  createdAt: '2026-09-20T00:00:00.000Z',
  updatedAt: '2026-09-20T00:00:00.000Z',
});

describe('summarize', () => {
  it('候補ごとに ○△× を数える', () => {
    const result = summarize(candidates, [
      answer('a1', '山田', 'YES', 'NO'),
      answer('a2', '佐藤', 'MAYBE', 'NO'),
    ]);

    expect(result[0]).toEqual({ candidateId: 'c1', yes: 1, maybe: 1, no: 0, score: 1.5 });
    expect(result[1]).toEqual({ candidateId: 'c2', yes: 0, maybe: 0, no: 2, score: 0 });
  });

  it('回答が無い候補は0件として扱う', () => {
    const result = summarize(candidates, []);
    expect(result.every((t) => t.yes === 0 && t.maybe === 0 && t.no === 0)).toBe(true);
  });
});

describe('bestCandidateIds', () => {
  it('スコア最大の候補を返す', () => {
    const answers = [answer('a1', '山田', 'YES', 'MAYBE'), answer('a2', '佐藤', 'YES', 'NO')];
    expect(bestCandidateIds(summarize(candidates, answers), answers.length)).toEqual(
      new Set(['c1']),
    );
  });

  it('同点なら複数返す', () => {
    const answers = [answer('a1', '山田', 'YES', 'YES')];
    expect(bestCandidateIds(summarize(candidates, answers), answers.length)).toEqual(
      new Set(['c1', 'c2']),
    );
  });

  it('回答が0件なら強調しない', () => {
    expect(bestCandidateIds(summarize(candidates, []), 0).size).toBe(0);
  });

  it('全員が不参加なら強調しない', () => {
    const answers = [answer('a1', '山田', 'NO', 'NO')];
    expect(bestCandidateIds(summarize(candidates, answers), answers.length).size).toBe(0);
  });
});

describe('AnswerGrid', () => {
  it('回答が無いときは空状態を出す', () => {
    render(<AnswerGrid candidates={candidates} answers={[]} />);
    expect(screen.getByText('まだ回答がありません。')).toBeInTheDocument();
  });

  it('回答者名と記号を表示し、自分の行に印を付ける', () => {
    render(
      <AnswerGrid
        candidates={candidates}
        answers={[answer('a1', '山田', 'YES', 'NO')]}
        highlightAnswerId="a1"
      />,
    );

    expect(screen.getByText('山田')).toBeInTheDocument();
    expect(screen.getByText('自分')).toBeInTheDocument();
    expect(screen.getByTitle('YES')).toHaveTextContent('○');
    expect(screen.getByTitle('NO')).toHaveTextContent('×');
  });

  it('最多の候補に「最多」バッジを付ける', () => {
    render(<AnswerGrid candidates={candidates} answers={[answer('a1', '山田', 'YES', 'NO')]} />);
    expect(screen.getAllByText('最多')).toHaveLength(1);
  });
});

// These assertions verify the Japanese interface explicitly.
beforeEach(() => localStorage.setItem('tsudou:language', 'ja'));
