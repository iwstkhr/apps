import type { AnyFieldMeta } from '@tanstack/react-form';

/**
 * TanStack Form のフィールドから表示すべきエラーを1つ取り出す。
 *
 * 触られる前 (isTouched=false) は出さない。submit 時にすべてのフィールドが
 * touched になるため、送信を試みた時点では未入力のエラーも表示される。
 */
export function fieldError(meta: AnyFieldMeta): string | null {
  if (!meta.isTouched) return null;
  const first = meta.errors.find((error) => error != null);
  return first == null ? null : String(first);
}
