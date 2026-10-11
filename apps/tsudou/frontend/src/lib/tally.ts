import type { AnswerView, Candidate } from './types';

export type CandidateTally = {
  candidateId: string;
  yes: number;
  maybe: number;
  no: number;
  /** Score used for sorting: attending = 1 point, undecided = 0.5 points. */
  score: number;
};

/**
 * Totals per candidate. Used to highlight the leading candidates.
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

/** The ids of the highest-scoring candidates (several if tied). Empty when there are no responses or nobody can attend. */
export function bestCandidateIds(
  tallies: readonly CandidateTally[],
  answerCount: number,
): Set<string> {
  if (answerCount === 0 || tallies.length === 0) return new Set();

  const best = Math.max(...tallies.map((t) => t.score));
  if (best === 0) return new Set();

  return new Set(tallies.filter((t) => t.score === best).map((t) => t.candidateId));
}
