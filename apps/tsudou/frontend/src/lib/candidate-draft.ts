import { fromDateTimeLocal, toDateTimeLocal } from './format';
import type { Candidate } from './types';

export type CandidateDraft = {
  /** The id of an existing candidate. null when newly added (the server assigns one). */
  id: string | null;
  /** The value of `<input type="datetime-local">`. */
  value: string;
};

export function emptyCandidate(): CandidateDraft {
  return { id: null, value: '' };
}

/** Defaulting to "next Saturday 19:00" means one entry is enough for most uses. */
export function defaultCandidate(): CandidateDraft {
  const date = new Date();
  date.setDate(date.getDate() + ((6 - date.getDay() + 7) % 7 || 7));
  date.setHours(19, 0, 0, 0);
  return { id: null, value: toDateTimeLocal(date.toISOString()) };
}

export function candidatesToDrafts(candidates: readonly Candidate[]): CandidateDraft[] {
  return candidates.map((c) => ({ id: c.id, value: toDateTimeLocal(c.startAt) }));
}

/** Drop rows that cannot be parsed as date-times (so empty rows being typed are not sent). */
export function candidatesToInput(drafts: readonly CandidateDraft[]) {
  return drafts.flatMap((draft) => {
    const startAt = fromDateTimeLocal(draft.value);
    return startAt ? [{ id: draft.id, startAt }] : [];
  });
}

/** The day after the previous candidate, at the same time. Reduces typing when listing consecutive days. */
export function nextCandidateAfter(last: CandidateDraft | undefined): CandidateDraft {
  if (!last?.value) return emptyCandidate();
  const next = new Date(last.value);
  if (Number.isNaN(next.getTime())) return emptyCandidate();
  next.setDate(next.getDate() + 1);
  return { id: null, value: toDateTimeLocal(next.toISOString()) };
}
