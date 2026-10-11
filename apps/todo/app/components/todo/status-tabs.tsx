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
 * Status filters laid out horizontally above the list, showing counts within the selected folder.
 * Text-only tabs are easy to miss, so they take a segmented form where the selected one is raised inside a bordered track.
 * On narrow screens they scroll horizontally instead of wrapping.
 */
export function StatusTabs({ value, counts, onChange }: StatusTabsProps) {
  return (
    // A fieldset does not shrink below its content by default, so min-w-0 allows horizontal scrolling
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
