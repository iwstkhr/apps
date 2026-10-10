export const THEMES = [
  { id: 'standard', label: 'スタンダード', colors: ['#f8fafc', '#334155', '#2563eb'] },
  { id: 'forest', label: 'フォレスト', colors: ['#12372a', '#ffffff', '#245a48'] },
  { id: 'sakura', label: 'サクラ', colors: ['#4a2034', '#ffffff', '#783f59'] },
  { id: 'sand', label: 'サンド', colors: ['#3e3025', '#ffffff', '#71513c'] },
  { id: 'lavender', label: 'ラベンダー', colors: ['#3f0e40', '#ffffff', '#5b2b60'] },
] as const;

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
  return THEMES.find((theme) => theme.id === value)?.id ?? 'standard';
}
