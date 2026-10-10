import { cx } from '../lib/cx';
import { setLanguage, t, useLanguage } from '../lib/i18n';

export function LanguageSelect() {
  const language = useLanguage();
  return (
    <fieldset className="space-y-1">
      <legend className="mb-1 px-3 text-xs font-medium text-slate-500 dark:text-slate-400">
        {t('言語')}
      </legend>
      {(
        [
          ['en', 'English'],
          ['ja', '日本語'],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          lang={value}
          aria-pressed={language === value}
          onClick={() => setLanguage(value)}
          className={cx(
            'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-indigo-600 dark:focus-visible:outline-indigo-400',
            language === value
              ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
          )}
        >
          {label}
          <span aria-hidden="true">{language === value ? '✓' : ''}</span>
        </button>
      ))}
    </fieldset>
  );
}
