import { useRef } from 'react';
import { ShelterTableHeader } from '~/components/table/shelter-table-header';
import { ShelterTableRows } from '~/components/table/shelter-table-rows';
import { DATASET_UPDATED_AT } from '~/generated/dataset-meta';
import type { Shelter } from '~/types/shelter';

const DATASET_SOURCE_URL = 'https://www.gsi.go.jp/bousaichiri/hinanbasho.html';
const DATASET_SOURCE_LABEL = '国土地理院 指定緊急避難場所データ';

interface MapTableProps {
  /** Shelters that pass the filters. */
  shelters: Shelter[];
  /** The filtered shelters inside the map viewport. */
  visibleShelters?: Shelter[];
  withinMapOnly?: boolean;
  onWithinMapOnlyChange?: (withinMapOnly: boolean) => void;
  selectedShelterId?: Shelter['id'] | null;
  onSelect?: (shelter: Shelter) => void;
}

export function MapTable({
  shelters,
  visibleShelters = shelters,
  withinMapOnly = false,
  onWithinMapOnlyChange,
  selectedShelterId,
  onSelect,
}: MapTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rows = withinMapOnly ? visibleShelters : shelters;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-slate-700">
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
        <div className="flex shrink-0 items-center gap-3">
          {onWithinMapOnlyChange && (
            <label className="inline-flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={withinMapOnly}
                onChange={(event) => onWithinMapOnlyChange(event.target.checked)}
                className="size-3.5"
              />
              地図の表示範囲のみ
            </label>
          )}
          <p className="tabular-nums text-slate-600">
            <span className="font-medium text-slate-800">{rows.length.toLocaleString()} 件</span>
            {withinMapOnly && <span> / 該当 {shelters.length.toLocaleString()} 件</span>}
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
        <div ref={tableContainerRef} className="min-h-0 flex-1 overflow-auto">
          <div className="min-w-[58rem] text-left text-sm text-slate-800" role="table">
            <ShelterTableHeader />
            <ShelterTableRows
              shelters={rows}
              scrollContainerRef={tableContainerRef}
              selectedShelterId={selectedShelterId}
              onSelect={onSelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
