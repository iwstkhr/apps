/**
 * 以前のバージョンは管理トークンと回答編集キーを localStorage に保存していた。
 * 共有 PC に残っていると次の利用者に使われるため、起動時に消す。
 * 今は両方ともメモリにだけ持つ (keyring.ts)。
 */
const LEGACY_KEYS = ['tsudou:hosted', 'tsudou:answered'];

export function purgeLegacyTokens(): void {
  for (const key of LEGACY_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // 読み書きできない環境ならそもそも残っていない
    }
  }
}
