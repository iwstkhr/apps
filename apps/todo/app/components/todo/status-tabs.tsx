import { StatusIcon } from '~/components/todo/status-icon';
import { cn } from '~/lib/cn';
import { t } from '~/lib/i18n';
import { STATUS_FILTER_OPTIONS, type StatusFilter } from '~/lib/todo-filters';

interface StatusTabsProps {
  value: StatusFilter;
  counts: Record<StatusFilter, number>;
  onChange: (value: StatusFilter) => void;
}

/**
 * 一覧の上に横に並べるステータスの絞り込み。選んでいるフォルダの中の件数を出す。
 * 文字だけのタブは見落としやすいので、枠のある溝の中で選んだものを浮かせるセグメントの形にする。
 * 狭い画面では折り返さずに横にスクロールする。
 */
export function StatusTabs({ value, counts, onChange }: StatusTabsProps) {
  return (
    // fieldset は既定で中身より狭くならないので、min-w-0 で横スクロールできるようにする
    <fieldset className="flex w-fit min-w-0 max-w-full gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-100 p-1 [scrollbar-width:thin] dark:border-slate-800 dark:bg-slate-950">
      <legend className="sr-only">{t('ステータス')}</legend>
      {STATUS_FILTER_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          className={cn(
            'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors',
            value === option.value
              ? 'bg-white font-semibold text-blue-800 shadow-sm ring-1 ring-blue-500 dark:bg-slate-800 dark:text-blue-200 dark:ring-blue-400'
              : 'text-slate-700 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-800/60',
          )}
          onClick={() => onChange(option.value)}
        >
          <span className="flex items-center gap-2">
            <StatusIcon status={option.value} />
            {t(option.label)}
          </span>
          <span className="rounded-full bg-slate-200 px-1.5 text-xs font-normal tabular-nums text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {counts[option.value]}
          </span>
        </button>
      ))}
    </fieldset>
  );
}
