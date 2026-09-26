import { fromDateTimeLocal, toDateTimeLocal } from './format';
import type { Candidate } from './types';

export type CandidateDraft = {
  /** 既存候補の id。新規追加なら null (サーバ側で採番される)。 */
  id: string | null;
  /** `<input type="datetime-local">` の値。 */
  value: string;
};

export function emptyCandidate(): CandidateDraft {
  return { id: null, value: '' };
}

/** 「次の土曜 19:00」を初期値にしておくと、たいていの用途で入力が1回で済む。 */
export function defaultCandidate(): CandidateDraft {
  const date = new Date();
  date.setDate(date.getDate() + ((6 - date.getDay() + 7) % 7 || 7));
  date.setHours(19, 0, 0, 0);
  return { id: null, value: toDateTimeLocal(date.toISOString()) };
}

export function candidatesToDrafts(candidates: readonly Candidate[]): CandidateDraft[] {
  return candidates.map((c) => ({ id: c.id, value: toDateTimeLocal(c.startAt) }));
}

/** 日時として解釈できない行は捨てる (入力途中の空行を送らないため)。 */
export function candidatesToInput(drafts: readonly CandidateDraft[]) {
  return drafts.flatMap((draft) => {
    const startAt = fromDateTimeLocal(draft.value);
    return startAt ? [{ id: draft.id, startAt }] : [];
  });
}

/** 直前の候補の翌日・同時刻。連日の候補を並べるときの入力を減らす。 */
export function nextCandidateAfter(last: CandidateDraft | undefined): CandidateDraft {
  if (!last?.value) return emptyCandidate();
  const next = new Date(last.value);
  if (Number.isNaN(next.getTime())) return emptyCandidate();
  next.setDate(next.getDate() + 1);
  return { id: null, value: toDateTimeLocal(next.toISOString()) };
}
