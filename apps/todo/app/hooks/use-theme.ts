import { useEffect, useState } from 'react';
import {
  APPEARANCE_KEY,
  type Appearance,
  DEFAULT_THEME,
  THEME_KEY,
  type Theme,
  toAppearance,
  toTheme,
} from '~/lib/themes';

/** Saves this browser's color settings separately from the data. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [appearance, setAppearance] = useState<Appearance>('system');
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      setTheme(toTheme(localStorage.getItem(THEME_KEY)));
      setAppearance(toAppearance(localStorage.getItem(APPEARANCE_KEY)));
    } catch {
      // Themes can be chosen even when storage is unavailable.
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Apply the chosen theme even when it cannot be saved.
    }
  }, [theme, restored]);

  useEffect(() => {
    if (!restored) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.mode =
        appearance === 'system' ? (media.matches ? 'dark' : 'light') : appearance;
    };
    apply();
    media.addEventListener('change', apply);
    try {
      localStorage.setItem(APPEARANCE_KEY, appearance);
    } catch {
      // Apply the brightness setting even when it cannot be saved.
    }
    return () => media.removeEventListener('change', apply);
  }, [appearance, restored]);

  return { theme, setTheme, appearance, setAppearance };
}
