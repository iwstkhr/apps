import { LIMITS } from '@tsudou/shared/limits';
import { CANDIDATE_MESSAGE, requiredMessage, tooLongMessage } from '@tsudou/shared/messages';
import type { AnswerStatus, Candidate, CandidateInput, Choice } from '@tsudou/shared/types';
import { validationError } from './errors';
import { generateCandidateId } from './tokens';

export { LIMITS };

/** Sets used for validation. Separate from the UI display order (answer-form.tsx), so they are not merged. */
const STATUSES: readonly AnswerStatus[] = ['YES', 'NO', 'MAYBE'];

/** Trim surrounding whitespace. Returns null if the result is empty (empty strings are not stored). */
export function normalizeOptionalText(
  value: string | null | undefined,
  label: string,
  max: number,
): string | null {
  return value?.trim() ? validateRequiredText(value, label, max) : null;
}

export function validateRequiredText(
  value: string | null | undefined,
  label: string,
  max: number,
): string {
  const trimmed = (value ?? '').trim();
  if (trimmed === '') {
    throw validationError(requiredMessage(label));
  }
  if (trimmed.length > max) {
    throw validationError(tooLongMessage(label, max));
  }
  return trimmed;
}

export function validateTitle(value: string | null | undefined): string {
  return validateRequiredText(value, 'イベント名', LIMITS.titleMax);
}

export function validateName(value: string | null | undefined): string {
  return validateRequiredText(value, 'お名前', LIMITS.nameMax);
}

export function validateFee(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (!Number.isInteger(value)) {
    throw validationError('参加費は整数で入力してください');
  }
  if (value < 0 || value > LIMITS.feeMax) {
    throw validationError(
      `参加費は 0〜${LIMITS.feeMax.toLocaleString('ja-JP')} 円の範囲で入力してください`,
    );
  }
  return value;
}

/**
 * Validate and normalize candidate dates.
 * - 1 to 30 items
 * - Must parse as ISO 8601
 * - No duplicate date-times
 * - With rejectPast, date-times before now are rejected (when creating an event).
 *   Editing allows them so that the event can be saved with past candidates kept
 * - Existing ids are kept (so links to existing responses are not broken); new ones are assigned
 * - Sorted by start date-time in ascending order
 */
export function validateCandidates(
  input: readonly CandidateInput[] | null | undefined,
  { rejectPast = false, now = Date.now() }: { rejectPast?: boolean; now?: number } = {},
): Candidate[] {
  if (!input || input.length === 0) {
    throw validationError(CANDIDATE_MESSAGE.none);
  }
  if (input.length > LIMITS.candidatesMax) {
    throw validationError(CANDIDATE_MESSAGE.tooMany(LIMITS.candidatesMax));
  }

  const seen = new Set<number>();
  const candidates = input.map((candidate) => {
    const time = Date.parse(candidate.startAt);
    if (Number.isNaN(time)) {
      throw validationError(CANDIDATE_MESSAGE.badFormat);
    }
    if (rejectPast && time < now) {
      throw validationError(CANDIDATE_MESSAGE.past);
    }
    if (seen.has(time)) {
      throw validationError(CANDIDATE_MESSAGE.duplicate);
    }
    seen.add(time);

    return {
      id: candidate.id?.trim() || generateCandidateId(),
      startAt: new Date(time).toISOString(),
    };
  });

  // Duplicate ids are broken client input, so reject them
  if (new Set(candidates.map((c) => c.id)).size !== candidates.length) {
    throw validationError('候補の識別子が重複しています');
  }

  return candidates.sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
}

/**
 * Validate and normalize a response. Requires a strict 1:1 match with the candidates,
 * and returns the choices sorted in the event's candidate order.
 */
export function validateChoices(
  input: readonly Choice[] | null | undefined,
  candidates: readonly Candidate[],
): Choice[] {
  if (!input || input.length === 0) {
    throw validationError('すべての候補に回答してください');
  }

  const byId = new Map<string, AnswerStatus>();
  for (const choice of input) {
    if (!STATUSES.includes(choice.status)) {
      throw validationError('回答の値が正しくありません');
    }
    if (byId.has(choice.candidateId)) {
      throw validationError('同じ候補に対する回答が重複しています');
    }
    byId.set(choice.candidateId, choice.status);
  }

  const valid = new Set(candidates.map((c) => c.id));
  for (const candidateId of byId.keys()) {
    if (!valid.has(candidateId)) {
      throw validationError('存在しない候補に対する回答が含まれています');
    }
  }

  return candidates.map((candidate) => {
    const status = byId.get(candidate.id);
    if (!status) {
      throw validationError('すべての候補に回答してください');
    }
    return { candidateId: candidate.id, status };
  });
}

/**
 * After candidates are edited, remove from existing responses the candidates that no longer exist,
 * and fill newly added candidates with MAYBE (undecided).
 */
export function reconcileChoices(
  existing: readonly Choice[],
  candidates: readonly Candidate[],
): Choice[] {
  const byId = new Map(existing.map((choice) => [choice.candidateId, choice.status]));
  return candidates.map((candidate) => ({
    candidateId: candidate.id,
    status: byId.get(candidate.id) ?? 'MAYBE',
  }));
}
