// フォーム部品とボタンで共通に使う Tailwind のクラス

export const fieldClass =
  'rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-800';

export const inputClass = `${fieldClass} w-full`;

export const primaryButtonClass =
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50';

export const secondaryButtonClass =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800';

/** 元に戻せない操作 (置き換え・完全に削除) のボタン */
export const dangerButtonClass = `${secondaryButtonClass} border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950`;
