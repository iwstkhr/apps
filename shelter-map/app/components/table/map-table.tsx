import { createColumnHelper, flexRender, tableFeatures, useTable } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ColumnHeaderWithFilter } from '~/components/table/column-header-filter';
import { DATASET_UPDATED_AT } from '~/generated/dataset-meta';
import { useDebouncedValueEffect } from '~/hooks/use-debounced-value-effect';
import { useShelterMapContext } from '~/hooks/use-shelter-map-context';
import { cn } from '~/lib/cn';
import type { Shelter } from '~/types/shelter';
import {
  emptyShelterColumnFilters,
  isShelterFilterColumnId,
  type ShelterColumnFilters,
  type ShelterFilterColumnId,
} from '~/types/shelter-filters';
import { getShelterTypeTableLabel, isShelterTypeKey, shelterTypeKeys } from '~/types/shelter-type';

const DEBOUNCE_MS = 200;
const ROW_ESTIMATE_HEIGHT = 56;
const GRID_TEMPLATE_COLUMNS = `14rem minmax(16rem,1fr) repeat(${shelterTypeKeys.length}, 3.5rem)`;
const DATASET_SOURCE_URL = 'https://www.gsi.go.jp/bousaichiri/hinanbasho.html';
const DATASET_SOURCE_LABEL = '国土地理院 指定緊急避難場所データ';
const SHELTER_TYPE_COLUMN_CLASS = 'px-1 text-center';
const SHELTER_TYPE_HEADER_CLASS = 'text-xs leading-snug';
const NAME_COLUMN_CLASS =
  'sticky left-0 z-10 bg-white group-hover:bg-blue-50 group-odd:bg-white group-even:bg-slate-50 group-even:group-hover:bg-blue-50';
const NAME_HEADER_CLASS = 'sticky left-0 z-10 bg-slate-100';

// Rows are filtered upstream in the shelter map context, so this table only
// needs the core row model and registers no optional features.
const features = tableFeatures({});

const columnHelper = createColumnHelper<typeof features, Shelter>();

function ShelterTypeCell({ ready }: { ready: boolean }) {
  return <span className={ready ? 'app-content-ready' : 'app-content-not-ready'} />;
}

function getHeaderClassName(columnId: ShelterFilterColumnId): string {
  return cn(
    columnId === 'name' && NAME_HEADER_CLASS,
    isShelterTypeKey(columnId) && `${SHELTER_TYPE_COLUMN_CLASS} ${SHELTER_TYPE_HEADER_CLASS}`,
  );
}

function getCellClassName(columnId: string): string {
  return cn(
    'px-3 py-2',
    (columnId === 'name' || columnId === 'address') && 'break-words leading-snug',
    columnId === 'name' && NAME_COLUMN_CLASS,
    isShelterTypeKey(columnId) && SHELTER_TYPE_COLUMN_CLASS,
  );
}

export function MapTable() {
  const { displayedShelters, updateColumnFilters } = useShelterMapContext();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [draftFilters, setDraftFilters] = useState<ShelterColumnFilters>(emptyShelterColumnFilters);
  const [openFilterColumn, setOpenFilterColumn] = useState<ShelterFilterColumnId | null>(null);

  useDebouncedValueEffect(draftFilters, updateColumnFilters, DEBOUNCE_MS);

  useEffect(() => {
    if (!openFilterColumn) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (target.closest('[data-filter-toggle], [data-filter-popover]')) {
        return;
      }
      setOpenFilterColumn(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [openFilterColumn]);

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('name', {
          header: '名前',
          cell: (info) => info.getValue(),
        }),
        columnHelper.accessor('address', {
          header: '住所',
          cell: (info) => info.getValue(),
        }),
        ...shelterTypeKeys.map((key) =>
          columnHelper.accessor((row) => row.type[key], {
            id: key,
            header: getShelterTypeTableLabel(key),
            cell: (info) => <ShelterTypeCell ready={info.getValue()} />,
          }),
        ),
      ]),
    [],
  );

  const table = useTable({
    features,
    data: displayedShelters,
    columns,
    getRowId: (row) => row.id,
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_ESTIMATE_HEIGHT,
    overscan: 10,
  });

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
            <div
              className="sticky top-0 z-20 grid border-b border-slate-300 bg-slate-100 text-slate-900"
              style={{ gridTemplateColumns: GRID_TEMPLATE_COLUMNS }}
              role="row"
            >
              {table.getHeaderGroups()[0]?.headers.map((header) => {
                if (header.isPlaceholder || !isShelterFilterColumnId(header.column.id)) {
                  return null;
                }

                const columnId = header.column.id;
                const { header: label } = header.column.columnDef;

                return (
                  <ColumnHeaderWithFilter
                    key={header.id}
                    columnId={columnId}
                    label={typeof label === 'string' ? label : columnId}
                    className={getHeaderClassName(columnId)}
                    isOpen={openFilterColumn === columnId}
                    filters={draftFilters}
                    onToggle={() =>
                      setOpenFilterColumn((current) => (current === columnId ? null : columnId))
                    }
                    onFiltersChange={setDraftFilters}
                  />
                );
              })}
            </div>

            <div
              role="rowgroup"
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                if (!row) {
                  return null;
                }

                return (
                  <div
                    key={row.id}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    className="group absolute left-0 top-0 grid w-full border-t border-slate-200 odd:bg-white even:bg-slate-50 hover:bg-blue-50"
                    style={{
                      gridTemplateColumns: GRID_TEMPLATE_COLUMNS,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    role="row"
                  >
                    {row.getAllCells().map((cell) => (
                      <div key={cell.id} className={getCellClassName(cell.column.id)} role="cell">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
