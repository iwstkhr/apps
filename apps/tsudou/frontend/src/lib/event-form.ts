import { type CandidateDraft, candidatesToInput } from './candidate-draft';
import { parseFeeValue } from './form-validators';
import type { CandidateInput } from './types';

/** Form values shared by the create and edit forms. */
export type EventFormValues = {
  title: string;
  /** Kept as a string to preserve partial input, and converted to a number on submit. */
  fee: string;
  memo: string;
  candidates: CandidateDraft[];
};

export type EventFormInput = {
  title: string;
  fee: number | null;
  memo: string | null;
  candidates: CandidateInput[];
};

/** Convert values that passed form validation into the input shared by the create and edit APIs. */
export function eventFormToInput(value: EventFormValues): EventFormInput {
  return {
    title: value.title.trim(),
    fee: parseFeeValue(value.fee),
    memo: value.memo.trim() || null,
    candidates: candidatesToInput(value.candidates),
  };
}
