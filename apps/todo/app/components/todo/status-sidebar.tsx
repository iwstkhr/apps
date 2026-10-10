import { cn } from '~/lib/cn';
import { STATUS_FILTER_OPTIONS, type StatusFilter } from '~/lib/todo-filters';

interface StatusSidebarProps {
  value: StatusFilter;
  counts: Record<StatusFilter, number>;
  onChange: (value: StatusFilter) => void;
}

export function StatusSidebar({ value, counts, onChange }: StatusSidebarProps) {
  return (
    <nav
      aria-label="ステータス"
      className="mb-3 border-b border-slate-200 pb-3 dark:border-slate-800"
    >
      <p className="mb-2 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
        ステータス
      </p>
      <ul className="flex flex-col gap-0.5">
        {STATUS_FILTER_OPTIONS.map((option) => (
          <li key={option.value}>
            <button
              type="button"
              aria-pressed={value === option.value}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                value === option.value
                  ? 'bg-blue-50 text-blue-800 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800',
              )}
              onClick={() => onChange(option.value)}
            >
              <span>{option.label}</span>
              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {counts[option.value]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
