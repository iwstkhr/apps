import { FaGlobe } from 'react-icons/fa';
import { LANGUAGES, type Language, setLanguage, t, useLanguage } from '~/lib/i18n';

/**
 * ヘッダーの言語の切り替え。広い画面では「🌐 日本語 ▾」、狭い画面では地球のアイコンだけを出し、
 * その上に透明な select を重ねて、押すと同じ選択肢が開くようにする。
 */
export function LanguageSelect() {
  const language = useLanguage();

  return (
    <label
      className="language-select relative inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 focus-within:outline-2 focus-within:outline-blue-500 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      title={t('言語')}
    >
      <FaGlobe aria-hidden="true" />
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
        aria-label={t('言語')}
        className="absolute inset-0 cursor-pointer opacity-0 sm:static sm:cursor-pointer sm:bg-transparent sm:opacity-100 sm:focus:outline-none"
      >
        {LANGUAGES.map(({ id, label }) => (
          // 言語名はどの言語で表示していても、その言語自身の書き方で出す
          <option key={id} value={id} lang={id}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
