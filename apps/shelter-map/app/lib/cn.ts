/** Join class names, skipping falsy entries so conditional classes read inline. */
export function cn(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}
