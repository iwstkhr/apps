// Everything this app keeps in localStorage starts with this prefix (language, theme, display mode, view state)
const SETTINGS_PREFIX = 'todo:';

let resetting = false;

/** True while the app is being reset. Settings are not written then, so nothing is left behind by the reload. */
export function isResetting(): boolean {
  return resetting;
}

export function setResetting(value: boolean): void {
  resetting = value;
}

/** Delete every setting of this app. Keys are matched by prefix, so settings added later are deleted too. */
export function clearSettings(): void {
  try {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith(SETTINGS_PREFIX));
    for (const key of keys) localStorage.removeItem(key);
  } catch {
    // Nothing is saved when storage is unavailable
  }
}

/** Reload the page. A separate function so that tests can replace it. */
export function reloadPage(): void {
  window.location.reload();
}
