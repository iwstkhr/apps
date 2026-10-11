import { LIMITS } from '@tsudou/shared/limits';
import { CANDIDATE_MESSAGE, requiredMessage, tooLongMessage } from '@tsudou/shared/messages';
import type { CandidateDraft } from './candidate-draft';
import { fromDateTimeLocal } from './format';

/**
 * Field validators for TanStack Form. Return undefined when there is no error.
 *
 * The server (backend/src/validate.ts) is the final gatekeeper; these are
 * UI checks that catch problems before submission. Limits come from the shared LIMITS,
 * so the two sides cannot drift apart.
 */

export function validateRequiredText(
  value: string,
  label: string,
  max: number,
): string | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return requiredMessage(label);
  if (trimmed.length > max) return tooLongMessage(label, max);
  return undefined;
}

export function validateOptionalText(
  value: string,
  label: string,
  max: number,
): string | undefined {
  if (value.trim().length > max) return tooLongMessage(label, max);
  return undefined;
}

export const validateTitleValue = (value: string) =>
  validateRequiredText(value, 'イベント名', LIMITS.titleMax);

export const validateNameValue = (value: string) =>
  validateRequiredText(value, 'お名前', LIMITS.nameMax);

export const validateMemoValue = (value: string) =>
  validateOptionalText(value, 'メモ', LIMITS.memoMax);

export const validateMessageValue = (value: string) =>
  validateOptionalText(value, 'メッセージ', LIMITS.messageMax);

/** The fee is "blank = unset". Only when entered must it be an integer from 0 to the limit. */
export function validateFeeValue(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  if (!/^\d+$/.test(trimmed)) return '参加費は0以上の整数で入力してください';

  const fee = Number(trimmed);
  if (!Number.isSafeInteger(fee) || fee > LIMITS.feeMax) {
    return `参加費は ${LIMITS.feeMax.toLocaleString('ja-JP')} 円以下で入力してください`;
  }
  return undefined;
}

/** Returns null (unset) when blank. Use only on values that passed validateFeeValue. */
export function parseFeeValue(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : Number(trimmed);
}

export type CandidateRules = {
  /** Reject date-times before now (when creating an event). Editing allows keeping past candidates. */
  rejectPast?: boolean;
  now?: number;
};

/** Check one candidate row. Also used for per-row messages. */
export function validateCandidateRow(
  draft: CandidateDraft,
  { rejectPast = false, now = Date.now() }: CandidateRules = {},
): string | undefined {
  if (draft.value.trim() === '') return '日時を入力してください';
  const startAt = fromDateTimeLocal(draft.value);
  if (startAt === null) return CANDIDATE_MESSAGE.badFormat;
  if (rejectPast && Date.parse(startAt) < now) return CANDIDATE_MESSAGE.past;
  return undefined;
}

export function validateCandidatesValue(
  drafts: readonly CandidateDraft[],
  rules: CandidateRules = {},
): string | undefined {
  if (drafts.length === 0) return CANDIDATE_MESSAGE.none;
  if (drafts.length > LIMITS.candidatesMax) return CANDIDATE_MESSAGE.tooMany(LIMITS.candidatesMax);

  const rowErrors = drafts.map((draft) => validateCandidateRow(draft, rules));
  // Show only a summary for the field as a whole so it does not duplicate the per-row messages (validateCandidateRow)
  if (rowErrors.includes(CANDIDATE_MESSAGE.past)) return '過去の日時の候補があります';
  if (rowErrors.some((error) => error !== undefined)) {
    return '入力されていない候補があります';
  }

  // Sending the same date-time twice is rejected by the server, so catch it here
  const times = drafts.map((draft) => fromDateTimeLocal(draft.value));
  if (new Set(times).size !== times.length) return CANDIDATE_MESSAGE.duplicate;

  return undefined;
}
