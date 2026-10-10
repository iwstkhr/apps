import { LIMITS } from '@tsudou/shared/limits';
import { CANDIDATE_MESSAGE, requiredMessage, tooLongMessage } from '@tsudou/shared/messages';
import type { AnswerStatus, Candidate, CandidateInput, Choice } from '@tsudou/shared/types';
import { validationError } from './errors';
import { generateCandidateId } from './tokens';

export { LIMITS };

/** 検証用の集合。UI の表示順 (AnswerForm.tsx) とは別物なので統合しない。 */
const STATUSES: readonly AnswerStatus[] = ['YES', 'NO', 'MAYBE'];

/** 前後の空白を削る。空文字になったら null を返す (空文字は保存しない)。 */
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
 * 候補日時を検証して正規化する。
 * - 1〜30 件
 * - ISO8601 としてパースできること
 * - 同一日時の重複を禁止
 * - rejectPast のときは現在より前の日時を禁止 (イベント作成時)。
 *   編集では開催済みの候補を残したまま保存できるよう許す
 * - 既存の id は維持し (既存回答との紐付けが切れないように)、無ければ採番
 * - 開始日時の昇順に並べ替え
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

  // id の重複はクライアント由来の壊れた入力なので弾く
  if (new Set(candidates.map((c) => c.id)).size !== candidates.length) {
    throw validationError('候補の識別子が重複しています');
  }

  return candidates.sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
}

/**
 * 回答を検証して正規化する。候補と過不足なく 1:1 で対応していることを要求し、
 * イベント側の候補順に並べ替えて返す。
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
 * 候補を編集した結果、既存の回答から消えた候補を取り除き、
 * 新しく増えた候補を MAYBE (未定) で埋める。
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
