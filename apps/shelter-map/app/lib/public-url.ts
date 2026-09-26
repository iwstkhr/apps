/** Resolve a path under Vite `base` / React Router `basename` (e.g. when served under a sub-path). */
export function publicUrl(relativePath: string): string {
  const path = relativePath.replace(/^\//, '');
  return `${import.meta.env.BASE_URL}${path}`;
}
