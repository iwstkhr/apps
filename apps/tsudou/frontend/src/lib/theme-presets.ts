/** Slack-inspired palettes. IDs and header colors also appear in index.html and index.css. */
export const THEME_PRESETS = [
  { id: 'default', label: 'インディゴ', accent: '#4f46e5', light: '#ffffff', dark: '#0f172b' },
  {
    id: 'aubergine',
    label: 'オーベルジーヌ',
    accent: '#611f69',
    light: '#faf5fb',
    dark: '#29182e',
  },
  { id: 'ocean', label: 'オーシャン', accent: '#12617a', light: '#f1f9fc', dark: '#102a36' },
  { id: 'mint', label: 'ミント', accent: '#16654c', light: '#f1faf6', dark: '#142e25' },
  { id: 'sunset', label: 'サンセット', accent: '#9b4516', light: '#fff7f0', dark: '#352318' },
  { id: 'graphite', label: 'グラファイト', accent: '#454b54', light: '#f6f7f8', dark: '#22262c' },
] as const;

export type ThemePalette = (typeof THEME_PRESETS)[number]['id'];
export const PALETTE_KEY = 'tsudou:palette';

export function isThemePalette(value: unknown): value is ThemePalette {
  return THEME_PRESETS.some((preset) => preset.id === value);
}

export function readThemePalette(): ThemePalette {
  try {
    const saved = localStorage.getItem(PALETTE_KEY);
    return isThemePalette(saved) ? saved : 'default';
  } catch {
    return 'default';
  }
}
