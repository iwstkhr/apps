// The first one, indigo, is the default: a white header and sidebar with indigo accents.
// The others use a dark header and sidebar (color combinations are in themes.css)
export const THEMES = [
  { id: 'indigo', label: 'インディゴ', colors: ['#f8fafc', '#334155', '#4f46e5'] },
  { id: 'aubergine', label: 'オーベルジーヌ', colors: ['#3f0e40', '#ffffff', '#6a2c6b'] },
  { id: 'ocean', label: 'オーシャン', colors: ['#0b3954', '#ffffff', '#1a6896'] },
  { id: 'mint', label: 'ミント', colors: ['#123f3a', '#ffffff', '#1d7564'] },
  { id: 'sunset', label: 'サンセット', colors: ['#4a1c2c', '#ffffff', '#b0422b'] },
  { id: 'graphite', label: 'グラファイト', colors: ['#1f2328', '#ffffff', '#4b5563'] },
] as const;

export const DEFAULT_THEME = THEMES[0].id;

export type Theme = (typeof THEMES)[number]['id'];
export const THEME_KEY = 'todo:theme';
export const APPEARANCE_KEY = 'todo:appearance';
export const APPEARANCES = [
  { id: 'system', label: '自動' },
  { id: 'light', label: 'ライト' },
  { id: 'dark', label: 'ダーク' },
] as const;
export type Appearance = (typeof APPEARANCES)[number]['id'];

export function toAppearance(value: unknown): Appearance {
  return APPEARANCES.find((appearance) => appearance.id === value)?.id ?? 'system';
}

export function toTheme(value: unknown): Theme {
  return THEMES.find((theme) => theme.id === value)?.id ?? DEFAULT_THEME;
}
