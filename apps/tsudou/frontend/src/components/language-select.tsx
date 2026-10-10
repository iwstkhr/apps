import { setLanguage, t, useLanguage } from '../lib/i18n';

export function LanguageSelect() {
  const language = useLanguage();
  return (
    <label className="flex items-center">
      <span className="sr-only">{t('言語')}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value === 'en' ? 'en' : 'ja')}
        className="rounded-lg bg-white px-2 py-1.5 text-sm text-slate-700 ring-1 ring-slate-200 focus-visible:outline-2 focus-visible:outline-indigo-600 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700"
      >
        <option value="ja">日本語</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
