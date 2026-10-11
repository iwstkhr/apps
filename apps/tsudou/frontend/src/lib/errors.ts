/** Error codes in the `{ error: { code, message } }` returned by the API. */
const SERVER_CODES = [
  'VALIDATION',
  'NOT_FOUND',
  'FORBIDDEN',
  'CLOSED',
  'DUPLICATE_NAME',
  'RATE_LIMITED',
  'INTERNAL',
] as const;

export type AppErrorCode = (typeof SERVER_CODES)[number] | 'NETWORK';

const KNOWN_CODES: ReadonlySet<string> = new Set(SERVER_CODES);

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
 * Convert an error response body (parsed JSON) into ApiError.
 * Always returns ApiError, even for unexpected shapes (such as errors from Cloudflare itself).
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
  if (error instanceof Error) return error.message;
  return '予期しないエラーが発生しました';
}
