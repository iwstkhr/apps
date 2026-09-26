import type * as z from 'zod';
import type { AppErrorCode } from './errors';
import { validationError } from './errors';

/**
 * HTTP との境界で使う小さな道具。Express の型には依存しない。
 * リクエストの形は schemas.ts のスキーマで検査し、値の中身 (長さ・範囲など) は validate.ts に任せる。
 */

export const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  VALIDATION: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CLOSED: 409,
  DUPLICATE_NAME: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export const BAD_REQUEST = 'リクエストの形式が正しくありません';

/**
 * ボディを Zod のスキーマ (schemas.ts) で検査する。形が合わなければ一律 BAD_REQUEST にする
 * (値の中身は validate.ts が項目ごとの日本語のメッセージで弾く)。
 * PATCH では「省略 = 変更しない」「null = 消す」の意味になるので、スキーマの側で
 * 省略 (undefined) と null を区別できるようにしておく。
 */
export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body);
  if (!result.success) throw validationError(BAD_REQUEST);
  return result.data;
}
