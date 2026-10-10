import { useId, useRef } from 'react';
import { FaPalette } from 'react-icons/fa';
import { useTheme } from '~/hooks/use-theme';
import { secondaryButtonClass } from '~/lib/styles';
import { APPEARANCES, THEMES } from '~/lib/themes';

export function ThemePicker() {
  const { theme, setTheme, appearance, setAppearance } = useTheme();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        aria-label="テーマ"
        title="テーマを選ぶ"
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        onClick={() => dialogRef.current?.showModal()}
      >
        <FaPalette aria-hidden="true" />
        <span className="hidden sm:inline">テーマ</span>
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-900/50 dark:bg-slate-900 dark:text-slate-100"
      >
        <h2 id={titleId} className="text-lg font-bold">
          テーマ
        </h2>
        <fieldset className="mt-4 grid grid-cols-2 gap-3">
          <legend className="sr-only">テーマを選ぶ</legend>
          {THEMES.map((preset) => (
            <label key={preset.id} className="cursor-pointer">
              <input
                type="radio"
                name="theme"
                checked={theme === preset.id}
                onChange={() => setTheme(preset.id)}
                className="peer sr-only"
                aria-label={preset.label}
              />
              <span className="flex flex-col gap-2 rounded-md border border-slate-300 p-3 text-sm peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:ring-1 peer-checked:ring-blue-500 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-500 dark:border-slate-700 dark:peer-checked:bg-blue-950">
                <span className="flex overflow-hidden rounded" aria-hidden="true">
                  {preset.colors.map((color) => (
                    <span key={color} className="h-6 flex-1" style={{ backgroundColor: color }} />
                  ))}
                </span>
                {preset.label}
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-medium">表示モード</legend>
          <div className="flex gap-2">
            {APPEARANCES.map((mode) => (
              <label key={mode.id} className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="appearance"
                  checked={appearance === mode.id}
                  onChange={() => setAppearance(mode.id)}
                  className="peer sr-only"
                  aria-label={mode.label}
                />
                <span className="block rounded-md border border-slate-300 p-2 text-center text-sm peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:ring-1 peer-checked:ring-blue-500 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-500 dark:border-slate-700 dark:peer-checked:bg-blue-950">
                  {mode.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <form method="dialog" className="mt-4 flex justify-end">
          <button className={secondaryButtonClass} type="submit">
            閉じる
          </button>
        </form>
      </dialog>
    </>
  );
}
