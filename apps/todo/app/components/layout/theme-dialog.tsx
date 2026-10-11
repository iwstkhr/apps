import { type Ref, useId, useRef } from 'react';
import { useTheme } from '~/hooks/use-theme';
import { t } from '~/lib/i18n';
import { secondaryButtonClass } from '~/lib/styles';
import { APPEARANCES, THEMES } from '~/lib/themes';

/**
 * A dialog for choosing the theme and display mode, opened with showModal() through a ref from the header menu.
 * When it closes, the browser returns focus to the element focused before opening (the menu button).
 * Clicking the backdrop also closes it. Padding is on the inner div, so clicks on the dialog element itself count as backdrop clicks.
 */
export function ThemeDialog({ ref }: { ref: Ref<HTMLDialogElement> }) {
  const { theme, setTheme, appearance, setAppearance } = useTheme();
  const titleId = useId();
  // Do not close when pressed inside and released on the backdrop (e.g. while selecting text)
  const pressedBackdrop = useRef(false);

  return (
    // Escape also closes it, so a backdrop click is treated as a mouse shortcut
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape closes the dialog natively
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg bg-white text-slate-900 shadow-xl backdrop:bg-slate-900/50 dark:bg-slate-900 dark:text-slate-100"
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressedBackdrop.current && event.target === event.currentTarget) {
          event.currentTarget.close();
        }
        pressedBackdrop.current = false;
      }}
    >
      <div className="p-5">
        <h2 id={titleId} className="text-lg font-bold">
          {t('テーマ')}
        </h2>
        <fieldset className="mt-4 grid grid-cols-2 gap-3">
          <legend className="sr-only">{t('テーマを選ぶ')}</legend>
          {THEMES.map((preset) => (
            <label key={preset.id} className="cursor-pointer">
              <input
                type="radio"
                name="theme"
                checked={theme === preset.id}
                onChange={() => setTheme(preset.id)}
                className="peer sr-only"
                aria-label={t(preset.label)}
              />
              <span className="flex flex-col gap-2 rounded-md border border-slate-300 p-3 text-sm peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:ring-1 peer-checked:ring-blue-500 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-500 dark:border-slate-700 dark:peer-checked:bg-blue-950">
                <span className="flex overflow-hidden rounded" aria-hidden="true">
                  {preset.colors.map((color) => (
                    <span key={color} className="h-6 flex-1" style={{ backgroundColor: color }} />
                  ))}
                </span>
                {t(preset.label)}
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-medium">{t('表示モード')}</legend>
          <div className="flex gap-2">
            {APPEARANCES.map((mode) => (
              <label key={mode.id} className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="appearance"
                  checked={appearance === mode.id}
                  onChange={() => setAppearance(mode.id)}
                  className="peer sr-only"
                  aria-label={t(mode.label)}
                />
                <span className="block rounded-md border border-slate-300 p-2 text-center text-sm peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:ring-1 peer-checked:ring-blue-500 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-500 dark:border-slate-700 dark:peer-checked:bg-blue-950">
                  {t(mode.label)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <form method="dialog" className="mt-4 flex justify-end">
          <button className={secondaryButtonClass} type="submit">
            {t('閉じる')}
          </button>
        </form>
      </div>
    </dialog>
  );
}
