/**
 * 入力値の上限。サーバ (backend/src/validate.ts) とフロント
 * (frontend/src/lib/form-validators.ts) の両方から参照する唯一の定義。
 *
 * ブラウザにもバンドルされるため、Node 専用の API は使えない
 * (shared/tsconfig.json が DOM と Node の型を読み込まないので型エラーになる)。
 */
export const LIMITS = {
  titleMax: 100,
  memoMax: 2000,
  nameMax: 40,
  messageMax: 500,
  feeMax: 1_000_000,
  candidatesMax: 30,
} as const;

/**
 * イベントと回答の保持期間 (作成時点から)。
 * この期間を過ぎたレコードは Cron Trigger で自動削除される。
 */
export const RETENTION_MONTHS = 3;
