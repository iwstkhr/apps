/** クラス名の結合。false / null / undefined は無視する。 */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
