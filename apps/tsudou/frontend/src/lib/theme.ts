import { useCallback, useEffect, useState } from 'react';
import { PALETTE_KEY, readThemePalette, THEME_PRESETS, type ThemePalette } from './theme-presets';

/**
 * ライト / ダークの切り替え。選択は localStorage に覚え、
 * 「システム」のときは OS の設定 (prefers-color-scheme) に追従する。
 *
 * 初回描画のチラつきを避けるため、index.html のインラインスクリプトでも
 * 同じキーを読んで <html data-theme> と theme-color を先に決めている。キーや値を変えるときは
 * そちらも合わせて直すこと。
 */

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_KEY = 'tsudou:theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/** ブラウザ UI (アドレスバーやインストール後のタイトルバー) の色。ヘッダの背景 (white / slate-900) に揃える */
export const THEME_COLORS: Record<ResolvedTheme, string> = { light: '#ffffff', dark: '#0f172b' };

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

function applyTheme(theme: ResolvedTheme, palette: ThemePalette): void {
  const preset = THEME_PRESETS.find((entry) => entry.id === palette) ?? THEME_PRESETS[0];
  document.documentElement.dataset.palette = palette;
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', preset[theme]);
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference);

  const [palette, setPaletteState] = useState<ThemePalette>(readThemePalette);

  useEffect(() => {
    applyTheme(resolveTheme(preference, systemPrefersDark()), palette);
    if (preference !== 'system' || typeof window.matchMedia !== 'function') return;

    const media = window.matchMedia(DARK_QUERY);
    const onChange = (e: MediaQueryListEvent) =>
      applyTheme(resolveTheme('system', e.matches), palette);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference, palette]);

  const setPreference = useCallback((next: ThemePreference) => {
    writeThemePreference(next);
    setPreferenceState(next);
  }, []);

  const setPalette = useCallback((next: ThemePalette) => {
    try {
      if (next === 'default') localStorage.removeItem(PALETTE_KEY);
      else localStorage.setItem(PALETTE_KEY, next);
    } catch {
      // Keep the choice in memory when storage is unavailable.
    }
    setPaletteState(next);
  }, []);

  return { preference, setPreference, palette, setPalette };
}
