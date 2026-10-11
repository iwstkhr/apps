import { FaMagnifyingGlass, FaXmark } from 'react-icons/fa6';
import { cn } from '~/lib/cn';
import {
  emptyShelterFilters,
  hasActiveShelterFilters,
  type ShelterFilters,
  toggleShelterType,
} from '~/types/shelter-filters';
import { getShelterTypeTableLabel, shelterTypeKeys } from '~/types/shelter-type';

export function ShelterFilterBar({
  filters,
  onChange,
}: {
  filters: ShelterFilters;
  onChange: (filters: ShelterFilters) => void;
}) {
  const hasTypes = filters.types.length > 0;

  return (
    <search className="flex shrink-0 flex-col gap-2" aria-label="避難場所の絞り込み">
      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">名前・住所で検索</span>
          <FaMagnifyingGlass
            className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filters.keyword}
            placeholder="名前・住所で検索（スペース区切りで AND）"
            onChange={(event) => onChange({ ...filters, keyword: event.target.value })}
            className="w-full rounded-md border border-slate-300 bg-white py-1.5 pr-2 pl-8 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </label>
        {hasActiveShelterFilters(filters) && (
          <button
            type="button"
            onClick={() =>
              onChange({ ...emptyShelterFilters, withinMapOnly: filters.withinMapOnly })
            }
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
          >
            <FaXmark className="h-3.5 w-3.5" aria-hidden="true" />
            条件をクリア
          </button>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <fieldset className="m-0 min-w-0 flex-1 border-0 p-0">
          <legend className="sr-only">災害種別（選択した種別すべてに対応する避難場所）</legend>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible">
            {shelterTypeKeys.map((key) => {
              const selected = filters.types.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    onChange({ ...filters, types: toggleShelterType(filters.types, key) })
                  }
                  className={cn(
                    'shrink-0 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors sm:text-sm',
                    selected
                      ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-100',
                  )}
                >
                  {getShelterTypeTableLabel(key)}
                </button>
              );
            })}
          </div>
        </fieldset>
        {hasTypes && (
          <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-slate-700 sm:text-sm">
            <input
              type="checkbox"
              checked={filters.showNonMatching}
              onChange={(event) => onChange({ ...filters, showNonMatching: event.target.checked })}
              className="size-3.5"
            />
            <span>
              非該当も<span className="hidden sm:inline">灰色で</span>表示
            </span>
          </label>
        )}
      </div>
    </search>
  );
}
