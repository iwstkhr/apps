import type { AnswerView, Candidate } from './types';

export type CandidateTally = {
  candidateId: string;
  yes: number;
  maybe: number;
  no: number;
  /** 並べ替え用のスコア。参加=1点、未定=0.5点。 */
  score: number;
};

/**
 * 候補ごとの集計。最有力候補を強調するために使う。
 */
export function summarize(
  candidates: readonly Candidate[],
  answers: readonly AnswerView[],
): CandidateTally[] {
  return candidates.map((candidate) => {
    const tally: CandidateTally = { candidateId: candidate.id, yes: 0, maybe: 0, no: 0, score: 0 };

    for (const answer of answers) {
      const status = answer.choices.find((choice) => choice.candidateId === candidate.id)?.status;
      if (status === 'YES') tally.yes += 1;
      else if (status === 'MAYBE') tally.maybe += 1;
      else if (status === 'NO') tally.no += 1;
    }

    tally.score = tally.yes + tally.maybe * 0.5;
    return tally;
  });
}

/** 最もスコアの高い候補の id 群 (同点なら複数)。回答が0件、または全員が不参加なら空。 */
export function bestCandidateIds(
  tallies: readonly CandidateTally[],
  answerCount: number,
): Set<string> {
  if (answerCount === 0 || tallies.length === 0) return new Set();

  const best = Math.max(...tallies.map((t) => t.score));
  if (best === 0) return new Set();

  return new Set(tallies.filter((t) => t.score === best).map((t) => t.candidateId));
}
