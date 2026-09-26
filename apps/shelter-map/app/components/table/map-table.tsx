import { useRef } from 'react';
import { ShelterTableHeader } from '~/components/table/shelter-table-header';
import { ShelterTableRows } from '~/components/table/shelter-table-rows';
import { useShelterTableFilters } from '~/components/table/use-shelter-table-filters';
import { DATASET_UPDATED_AT } from '~/generated/dataset-meta';
import { useShelterMapContext } from '~/hooks/use-shelter-map-context';

const DATASET_SOURCE_URL = 'https://www.gsi.go.jp/bousaichiri/hinanbasho.html';
const DATASET_SOURCE_LABEL = '国土地理院 指定緊急避難場所データ';

export function MapTable() {
  const { displayedShelters, updateColumnFilters } = useShelterMapContext();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { draftFilters, openFilterColumn, setDraftFilters, toggleFilterColumn } =
    useShelterTableFilters(updateColumnFilters);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm text-slate-700">
        <p className="min-w-0 break-words">
          <a
            href={DATASET_SOURCE_URL}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-blue-700 hover:text-blue-800 hover:underline"
          >
            {DATASET_SOURCE_LABEL}
          </a>
          <span className="text-slate-600"> ({DATASET_UPDATED_AT})</span>
        </p>
        <p className="shrink-0 tabular-nums font-medium text-slate-800">
          {displayedShelters.length.toLocaleString()} 件
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
        <div ref={tableContainerRef} className="min-h-0 flex-1 overflow-auto">
          <div className="min-w-[58rem] text-left text-sm text-slate-800" role="table">
            <ShelterTableHeader
              filters={draftFilters}
              openFilterColumn={openFilterColumn}
              onToggleFilter={toggleFilterColumn}
              onFiltersChange={setDraftFilters}
            />
            <ShelterTableRows shelters={displayedShelters} scrollContainerRef={tableContainerRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
