import { useEffect, useState } from 'react';
import {
  APPEARANCE_KEY,
  type Appearance,
  THEME_KEY,
  type Theme,
  toAppearance,
  toTheme,
} from '~/lib/themes';

/** データとは別に、このブラウザの配色設定を保存する。 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('standard');
  const [appearance, setAppearance] = useState<Appearance>('system');
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      setTheme(toTheme(localStorage.getItem(THEME_KEY)));
      setAppearance(toAppearance(localStorage.getItem(APPEARANCE_KEY)));
    } catch {
      // 保存領域を使えなくてもテーマを選べる。
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // 保存できない場合も選択したテーマを適用する。
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
      // 保存できない場合も明るさの設定を適用する。
    }
    return () => media.removeEventListener('change', apply);
  }, [appearance, restored]);

  return { theme, setTheme, appearance, setAppearance };
}
