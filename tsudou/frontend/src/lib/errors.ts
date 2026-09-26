/** API が返す `{ error: { code, message } }` のエラーコード。 */
export type AppErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'CLOSED'
  | 'DUPLICATE_NAME'
  | 'RATE_LIMITED'
  | 'INTERNAL'
  | 'NETWORK';

const KNOWN_CODES = new Set<string>([
  'VALIDATION',
  'NOT_FOUND',
  'FORBIDDEN',
  'CLOSED',
  'DUPLICATE_NAME',
  'RATE_LIMITED',
  'INTERNAL',
]);

const FALLBACK_MESSAGE = '通信に失敗しました。時間をおいて再度お試しください';

export class ApiError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/**
 * エラーレスポンスのボディ (JSON をパースしたもの) を ApiError に変える。
 * 形が想定外 (Cloudflare 自体のエラーなど) でも必ず ApiError を返す。
 */
export function parseApiError(body: unknown): ApiError {
  const error =
    typeof body === 'object' && body !== null && 'error' in body
      ? (body as { error: unknown }).error
      : null;
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message).trim()
      : '';

  if (KNOWN_CODES.has(code) && message) {
    return new ApiError(code as AppErrorCode, message);
  }
  return new ApiError('INTERNAL', message || FALLBACK_MESSAGE);
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return '予期しないエラーが発生しました';
}
