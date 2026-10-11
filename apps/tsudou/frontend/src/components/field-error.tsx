import type { AnyFieldMeta } from '@tanstack/react-form';

/**
 * Extract the one error to show from a TanStack Form field.
 *
 * Nothing is shown before it is touched (isTouched=false). On submit every field
 * becomes touched, so errors for missing input also appear once submission is attempted.
 */
export function fieldError(meta: AnyFieldMeta): string | null {
  if (!meta.isTouched) return null;
  const first = meta.errors.find((error) => error != null);
  return first == null ? null : String(first);
}
