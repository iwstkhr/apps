import { useState } from 'react';
import { t, useLanguage } from '../lib/i18n';
import { useTheme } from '../lib/theme';
import { THEME_PRESETS } from '../lib/theme-presets';
import { ThemePaletteDialog } from './theme-palette-dialog';

export function ThemeToggle() {
  useLanguage();
  const { preference, setPreference, palette, setPalette } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const selectedPalette = THEME_PRESETS.find((preset) => preset.id === palette) ?? THEME_PRESETS[0];

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={t('テーマを選択')}
        aria-haspopup="dialog"
        onClick={() => setPaletteOpen(true)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 ring-inset hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
      >
        <span
          aria-hidden="true"
          className="size-3 rounded-full"
          style={{ backgroundColor: selectedPalette.accent }}
        />
        {t('テーマ')}
      </button>
      {paletteOpen && (
        <ThemePaletteDialog
          preference={preference}
          onPreferenceChange={setPreference}
          palette={palette}
          onSelect={setPalette}
          onClose={() => setPaletteOpen(false)}
        />
      )}
    </div>
  );
}
