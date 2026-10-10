import { type CandidateDraft, candidatesToInput } from './candidate-draft';
import { parseFeeValue } from './form-validators';
import type { CandidateInput } from './types';

/** 作成フォームと編集フォームで共通のフォーム値。 */
export type EventFormValues = {
  title: string;
  /** 入力途中も保持したいので文字列で持ち、送信時に数値へ変換する。 */
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

/** フォーム検証を通過した値を、作成・編集 API 共通の入力へ変換する。 */
export function eventFormToInput(value: EventFormValues): EventFormInput {
  return {
    title: value.title.trim(),
    fee: parseFeeValue(value.fee),
    memo: value.memo.trim() || null,
    candidates: candidatesToInput(value.candidates),
  };
}
