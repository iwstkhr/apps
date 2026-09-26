import { LIMITS } from '@tsudou/shared/limits';
import { CANDIDATE_MESSAGE, requiredMessage, tooLongMessage } from '@tsudou/shared/messages';
import type { CandidateDraft } from './candidateDraft';
import { fromDateTimeLocal } from './format';

/**
 * TanStack Form のフィールドバリデータ。エラーが無ければ undefined を返す。
 *
 * サーバ側 (backend/src/validate.ts) が最終的な門番であり、ここは
 * 送信前に気づかせるための UI 上の検査。上限値は LIMITS を共有しているので
 * 片方だけがズレることはない。
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

/** 参加費は「空欄 = 未設定」。入力された場合のみ 0〜上限の整数を要求する。 */
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

/** 空欄なら null (未設定) を返す。validateFeeValue を通過した値にのみ使う。 */
export function parseFeeValue(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : Number(trimmed);
}

export type CandidateRules = {
  /** 現在より前の日時を拒否する (イベント作成時)。編集では開催済みの候補を残せるよう許す。 */
  rejectPast?: boolean;
  now?: number;
};

/** 候補1行ぶんの検査。行ごとのメッセージ表示にも使う。 */
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
  // 行ごとのメッセージ (validateCandidateRow) と重ならないよう、欄全体では要約だけ出す
  if (rowErrors.includes(CANDIDATE_MESSAGE.past)) return '過去の日時の候補があります';
  if (rowErrors.some((error) => error !== undefined)) {
    return '入力されていない候補があります';
  }

  // 同じ日時を2つ送るとサーバに弾かれるので、ここで気づかせる
  const times = drafts.map((draft) => fromDateTimeLocal(draft.value));
  if (new Set(times).size !== times.length) return CANDIDATE_MESSAGE.duplicate;

  return undefined;
}
