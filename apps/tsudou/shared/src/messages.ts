/**
 * サーバ (backend/src/validate.ts) とフロント (frontend/src/lib/formValidators.ts) が共有する
 * バリデーション文言。同じ検査を両側で行うため、文言が片方だけズレないよう
 * ここを唯一の定義とする。
 *
 * ブラウザにもバンドルされるため、Node 専用の API は使えない (limits.ts と同じ制約)。
 */

export const requiredMessage = (label: string) => `${label}を入力してください`;

export const tooLongMessage = (label: string, max: number) =>
  `${label}は${max}文字以内で入力してください`;

/** 候補日時に関する文言。両側で同じ検査をしている分だけを共有する。 */
export const CANDIDATE_MESSAGE = {
  none: '日時の候補を1つ以上追加してください',
  tooMany: (max: number) => `日時の候補は${max}件までです`,
  badFormat: '日時の形式が正しくありません',
  duplicate: '同じ日時の候補が重複しています',
  past: '過去の日時は候補にできません',
} as const;
