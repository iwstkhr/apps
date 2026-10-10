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
    <div>
      <button
        type="button"
        aria-label={t('テーマを選択')}
        aria-haspopup="dialog"
        onClick={() => setPaletteOpen(true)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:outline-indigo-400"
      >
        {t('テーマ')}
        <span
          aria-hidden="true"
          className="size-3 rounded-full"
          style={{ backgroundColor: selectedPalette.accent }}
        />
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
