/** HTTP status per error code. AppErrorCode is derived from these keys. */
export const STATUS_BY_CODE = {
  VALIDATION: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CLOSED: 409,
  DUPLICATE_NAME: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
} as const;

export type AppErrorCode = keyof typeof STATUS_BY_CODE;

/**
 * An error the client can branch on. The HTTP layer (app.ts) determines the status from code
 * and returns it as is as `{ error: { code, message: detail } }`.
 * message takes the form `CODE: human-readable description` so it reads well in logs.
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

export const validationError = (detail: string) => new AppError('VALIDATION', detail);
export const notFoundError = (detail: string) => new AppError('NOT_FOUND', detail);
export const forbiddenError = (detail = '権限がありません') => new AppError('FORBIDDEN', detail);
export const duplicateNameError = () =>
  new AppError('DUPLICATE_NAME', 'この名前はすでに回答済みです');
