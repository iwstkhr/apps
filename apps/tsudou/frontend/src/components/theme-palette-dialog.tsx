import { type CSSProperties, useEffect, useId, useRef } from 'react';
import { cx } from '../lib/cx';
import { t, useLanguage } from '../lib/i18n';
import type { ThemePreference } from '../lib/theme';
import { THEME_PRESETS, type ThemePalette } from '../lib/theme-presets';
import { Button } from './ui';

export function ThemePaletteDialog({
  palette,
  preference,
  onPreferenceChange,
  onSelect,
  onClose,
}: {
  preference: ThemePreference;
  onPreferenceChange: (preference: ThemePreference) => void;
  palette: ThemePalette;
  onSelect: (palette: ThemePalette) => void;
  onClose: () => void;
}) {
  useLanguage();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const hintId = useId();
  const groupName = useId();

  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    dialog?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus();
    return () => {
      dialog?.close();
      opener?.focus();
    };
  }, []);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Esc closes the native modal via onCancel.
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={hintId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100%-2rem))] overflow-y-auto rounded-xl bg-white p-0 text-slate-900 shadow-xl ring-1 ring-slate-200 backdrop:bg-black/50 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700"
    >
      <div className="p-5">
        <h2 id={titleId} className="text-lg font-bold">
          {t('テーマ')}
        </h2>
        <p id={hintId} className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t('配色はアプリ全体にすぐ反映され、このブラウザに保存されます。')}
        </p>
        <fieldset className="mt-5">
          <legend className="text-sm font-semibold">{t('表示モード')}</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(
              [
                ['light', 'ライト'],
                ['dark', 'ダーク'],
                ['system', '自動'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={preference === value}
                onClick={() => onPreferenceChange(value)}
                className={cx(
                  'rounded-lg px-3 py-2.5 text-sm font-semibold ring-1 ring-inset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:focus-visible:outline-indigo-400',
                  preference === value
                    ? 'bg-indigo-600 text-white ring-indigo-600 dark:bg-indigo-400 dark:text-slate-950 dark:ring-indigo-400'
                    : 'bg-slate-50 text-slate-900 ring-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:hover:bg-slate-700',
                )}
              >
                {t(label)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            {t('自動は端末の設定に合わせます。')}
          </p>
        </fieldset>
        <fieldset className="mt-5 grid grid-cols-2 gap-3">
          <legend className="mb-2 text-sm font-semibold">{t('配色テーマ')}</legend>
          {THEME_PRESETS.map((preset) => (
            <label key={preset.id} className="relative cursor-pointer">
              <input
                type="radio"
                name={groupName}
                value={preset.id}
                checked={palette === preset.id}
                onChange={() => onSelect(preset.id)}
                className="peer sr-only"
              />
              <span className="block overflow-hidden rounded-lg ring-1 ring-slate-200 peer-checked:ring-2 peer-checked:ring-indigo-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-indigo-600 dark:ring-slate-700 dark:peer-checked:ring-indigo-400 dark:peer-focus-visible:outline-indigo-400">
                <span
                  aria-hidden="true"
                  className="theme-preview flex h-16"
                  style={
                    {
                      '--preview-light': preset.light,
                      '--preview-dark': preset.dark,
                      '--preview-accent': preset.accent,
                    } as CSSProperties
                  }
                >
                  <span className="w-1/4 bg-[var(--preview-sidebar)]" />
                  <span className="flex flex-1 flex-col justify-center gap-2 px-3">
                    <span
                      className="h-2 w-2/3 rounded-full"
                      style={{ backgroundColor: 'var(--preview-highlight)' }}
                    />
                    <span
                      className="h-2 w-full rounded-full opacity-20 dark:opacity-40"
                      style={{ backgroundColor: 'var(--preview-highlight)' }}
                    />
                    <span
                      className="h-2 w-1/2 rounded-full opacity-20 dark:opacity-40"
                      style={{ backgroundColor: 'var(--preview-highlight)' }}
                    />
                  </span>
                </span>
                <span className="flex items-center justify-between bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                  {t(preset.label)}
                  <span aria-hidden="true">{palette === preset.id ? '✓' : ''}</span>
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="mt-4 flex justify-end">
          <Button type="button" size="sm" variant="secondary" onClick={onClose}>
            {t('閉じる')}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
