export function shareUrl(eventId: string): string {
  return `${window.location.origin}/e/${eventId}`;
}

/**
 * 管理トークンはクエリ文字列ではなくハッシュフラグメントに載せる。
 * クエリだと Referer / アクセスログ / CDN ログに残るが、
 * フラグメントはサーバに送信されない。
 */
export function manageUrl(eventId: string, manageToken: string): string {
  return `${window.location.origin}${managePath(eventId, manageToken)}`;
}

/**
 * アプリ内リンク用の管理ページのパス。トークンはメモリにしか無いため、
 * フラグメントに載せておかないと新しいタブで開いたときに管理できない。
 */
export function managePath(eventId: string, manageToken: string): string {
  return `/e/${eventId}/manage#k=${encodeURIComponent(manageToken)}`;
}

/** 現在の URL のフラグメントから管理トークンを取り出す。 */
export function readTokenFromHash(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const token = params.get('k');
  return token && token.trim() !== '' ? token : null;
}

export type AnswerKey = { answerId: string; editToken: string };

/**
 * 回答編集 URL。共有 PC を想定して編集キーはブラウザに保存しないため (keyring.ts)、
 * 回答者が後から編集・削除するための唯一の手段になる。
 * 管理用 URL と同じく、サーバに送信されないフラグメントに載せる。
 */
export function answerEditUrl(eventId: string, key: AnswerKey): string {
  const params = new URLSearchParams({ a: key.answerId, k: key.editToken });
  return `${window.location.origin}/e/${eventId}#${params.toString()}`;
}

/** 現在の URL のフラグメントから回答 ID と編集キーを取り出す。 */
export function readAnswerKeyFromHash(hash: string): AnswerKey | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const answerId = params.get('a')?.trim();
  const editToken = params.get('k')?.trim();
  return answerId && editToken ? { answerId, editToken } : null;
}

/**
 * 履歴に残らないようフラグメントだけを URL から取り除く。
 * (トークンを keyring に取り込んだあとに呼ぶ)。
 * react-router が history.state に持つ位置情報は残しておく。
 */
export function stripHash(): void {
  if (!window.location.hash) return;
  window.history.replaceState(
    window.history.state,
    '',
    window.location.pathname + window.location.search,
  );
}
