import { cn } from '~/lib/cn';
import {
  isColumnFilterActive,
  type ShelterColumnFilters,
  type ShelterFilterColumnId,
  type ShelterTypeFilterValue,
} from '~/types/shelter-filters';
import { isShelterTypeKey } from '~/types/shelter-type';

const FILTER_INPUT_CLASS =
  'w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs font-normal text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200';

function FilterIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-blue-700' : 'text-slate-400')}
    >
      <path d="M3 4.5a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 .53 1.28l-4.72 4.72v4.55a.75.75 0 0 1-1.06.67l-2.5-1.25A.75.75 0 0 1 8 13.25V9.25L3.22 4.53A.75.75 0 0 1 3 4.5Z" />
    </svg>
  );
}

function ColumnFilterControl({
  columnId,
  label,
  filters,
  onFiltersChange,
}: {
  columnId: ShelterFilterColumnId;
  label: string;
  filters: ShelterColumnFilters;
  onFiltersChange: (filters: ShelterColumnFilters) => void;
}) {
  if (!isShelterTypeKey(columnId)) {
    return (
      <input
        type="text"
        value={filters[columnId]}
        placeholder={`${label}で絞り込み`}
        onChange={(event) => onFiltersChange({ ...filters, [columnId]: event.target.value })}
        className={FILTER_INPUT_CLASS}
      />
    );
  }

  return (
    <select
      value={filters.types[columnId]}
      onChange={(event) =>
        onFiltersChange({
          ...filters,
          types: { ...filters.types, [columnId]: event.target.value as ShelterTypeFilterValue },
        })
      }
      className={FILTER_INPUT_CLASS}
      aria-label="災害種別で絞り込み"
    >
      <option value="all">すべて</option>
      <option value="yes">指定あり (✅)</option>
      <option value="no">指定なし (❌)</option>
    </select>
  );
}

export function ColumnHeaderWithFilter({
  columnId,
  label,
  className,
  isOpen,
  filters,
  onToggle,
  onFiltersChange,
}: {
  columnId: ShelterFilterColumnId;
  label: string;
  className?: string;
  isOpen: boolean;
  filters: ShelterColumnFilters;
  onToggle: () => void;
  onFiltersChange: (filters: ShelterColumnFilters) => void;
}) {
  const isActive = isColumnFilterActive(columnId, filters);

  return (
    <div
      className={cn('relative flex items-start gap-1 px-3 py-2 font-medium', className)}
      role="columnheader"
    >
      <span className={cn('min-w-0 flex-1', isShelterTypeKey(columnId) && 'text-center')}>
        {label}
      </span>
      <div className="relative shrink-0 self-start">
        <button
          type="button"
          data-filter-toggle
          onClick={onToggle}
          className={cn(
            'rounded p-0.5 transition-colors hover:bg-slate-200',
            isActive && 'bg-blue-100',
          )}
          aria-label={`${label}のフィルター`}
          aria-expanded={isOpen}
        >
          <FilterIcon active={isActive} />
        </button>

        {isOpen ? (
          <div
            data-filter-popover
            className="absolute right-0 top-full z-30 mt-1 w-44 rounded-md border border-slate-200 bg-white p-2 shadow-lg"
          >
            <ColumnFilterControl
              columnId={columnId}
              label={label}
              filters={filters}
              onFiltersChange={onFiltersChange}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
