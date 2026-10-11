export function shareUrl(eventId: string): string {
  return `${window.location.origin}/e/${eventId}`;
}

/**
 * The manage token goes in the hash fragment, not the query string.
 * A query would remain in Referer, access logs, and CDN logs,
 * but fragments are never sent to the server.
 */
export function manageUrl(eventId: string, manageToken: string): string {
  return `${window.location.origin}${managePath(eventId, manageToken)}`;
}

/**
 * Path of the manage page for in-app links. The token exists only in memory,
 * so without putting it in the fragment the event cannot be managed when opened in a new tab.
 */
export function managePath(eventId: string, manageToken: string): string {
  return `/e/${eventId}/manage#k=${encodeURIComponent(manageToken)}`;
}

/** Extract the manage token from the current URL's fragment. */
export function readTokenFromHash(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const token = params.get('k');
  return token && token.trim() !== '' ? token : null;
}

export type AnswerKey = { answerId: string; editToken: string };

/**
 * The response edit URL. Edit keys are not saved in the browser because shared PCs are assumed (keyring.ts),
 * so this is the only way for respondents to edit or delete their response later.
 * As with the manage URL, it goes in the fragment, which is never sent to the server.
 */
export function answerEditUrl(eventId: string, key: AnswerKey): string {
  const params = new URLSearchParams({ a: key.answerId, k: key.editToken });
  return `${window.location.origin}/e/${eventId}#${params.toString()}`;
}

/** Extract the response ID and edit key from the current URL's fragment. */
export function readAnswerKeyFromHash(hash: string): AnswerKey | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const answerId = params.get('a')?.trim();
  const editToken = params.get('k')?.trim();
  return answerId && editToken ? { answerId, editToken } : null;
}

/**
 * Remove only the fragment from the URL so it does not stay in history
 * (called after the tokens are taken into the keyring).
 * The location state react-router keeps in history.state is preserved.
 */
export function stripHash(): void {
  if (!window.location.hash) return;
  window.history.replaceState(
    window.history.state,
    '',
    window.location.pathname + window.location.search,
  );
}
