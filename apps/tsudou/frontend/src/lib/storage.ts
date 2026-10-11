/**
 * Earlier versions saved manage tokens and response edit keys in localStorage.
 * Left on a shared PC, they could be used by the next person, so they are deleted on startup.
 * Both now live only in memory (keyring.ts).
 */
const LEGACY_KEYS = ['tsudou:hosted', 'tsudou:answered'];

export function purgeLegacyTokens(): void {
  for (const key of LEGACY_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // If storage cannot be read or written, nothing was left there in the first place
    }
  }
}
