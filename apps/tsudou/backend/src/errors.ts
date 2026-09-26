/**
 * クライアントが分岐できるエラー。HTTP 層 (http.ts) が code から
 * ステータスを決め、`{ error: { code, message: detail } }` としてそのまま返す。
 * message は `CODE: 人間向けの説明` の形にしておき、ログで読みやすくする。
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly detail: string;

  constructor(code: AppErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = 'AppError';
    this.code = code;
    this.detail = detail;
  }
}

export type AppErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'CLOSED'
  | 'DUPLICATE_NAME'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export const validationError = (detail: string) => new AppError('VALIDATION', detail);
export const notFoundError = (detail: string) => new AppError('NOT_FOUND', detail);
export const forbiddenError = (detail = '権限がありません') => new AppError('FORBIDDEN', detail);
export const duplicateNameError = () =>
  new AppError('DUPLICATE_NAME', 'この名前はすでに回答済みです');
