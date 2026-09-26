import { useCallback, useEffect, useState } from 'react';

/**
 * ライト / ダークの切り替え。選択は localStorage に覚え、
 * 「システム」のときは OS の設定 (prefers-color-scheme) に追従する。
 *
 * 初回描画のチラつきを避けるため、index.html のインラインスクリプトでも
 * 同じキーを読んで <html data-theme> を先に決めている。キーや値を変えるときは
 * そちらも合わせて直すこと。
 */

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_KEY = 'tsudou:theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export function readThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    return raw === 'light' || raw === 'dark' ? raw : 'system';
  } catch {
    return 'system';
  }
}

function writeThemePreference(preference: ThemePreference): void {
  try {
    if (preference === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, preference);
  } catch {
    // プライベートモードなど。次回開いたときに覚えていないだけなので無視してよい
  }
}

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return prefersDark ? 'dark' : 'light';
  return preference;
}

function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.dataset.theme = theme;
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference);

  useEffect(() => {
    applyTheme(resolveTheme(preference, systemPrefersDark()));
    if (preference !== 'system' || typeof window.matchMedia !== 'function') return;

    const media = window.matchMedia(DARK_QUERY);
    const onChange = (e: MediaQueryListEvent) => applyTheme(resolveTheme('system', e.matches));
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    writeThemePreference(next);
    setPreferenceState(next);
  }, []);

  return { preference, setPreference };
}
