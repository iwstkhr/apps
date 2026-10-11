/**
 * Validation messages shared by the server (backend/src/validate.ts) and the frontend (frontend/src/lib/form-validators.ts).
 * Both sides run the same checks, so this is the single definition
 * to keep the messages from drifting apart.
 *
 * This is also bundled for the browser, so Node-only APIs cannot be used (the same constraint as limits.ts).
 */

export const requiredMessage = (label: string) => `${label}を入力してください`;

export const tooLongMessage = (label: string, max: number) =>
  `${label}は${max}文字以内で入力してください`;

/** Messages about candidate dates. Only those for checks performed on both sides are shared. */
export const CANDIDATE_MESSAGE = {
  none: '日時の候補を1つ以上追加してください',
  tooMany: (max: number) => `日時の候補は${max}件までです`,
  badFormat: '日時の形式が正しくありません',
  duplicate: '同じ日時の候補が重複しています',
  past: '過去の日時は候補にできません',
} as const;
