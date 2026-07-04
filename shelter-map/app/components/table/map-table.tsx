import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DATASET_UPDATED_AT } from '~/generated/dataset-meta';
import { useDebouncedCallback } from '~/hooks/use-debounced-callback';
import { useShelterMapContext } from '~/hooks/use-shelter-map-context';
import type { Shelter } from '~/types/shelter';
import {
  emptyShelterColumnFilters,
  isColumnFilterActive,
  type ShelterColumnFilters,
  type ShelterTypeFilterValue,
} from '~/types/shelter-filters';
import {
  getShelterTypeTableLabel,
  type ShelterTypeKey,
  shelterTypeKeys,
} from '~/types/shelter-type';

type FilterableColumnId = 'name' | 'address' | ShelterTypeKey;

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
const FILTER_INPUT_CLASS =
  'w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs font-normal text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200';

const columnHelper = createColumnHelper<Shelter>();

function ShelterTypeCell({ ready }: { ready: boolean }) {
  return <span className={ready ? 'app-content-ready' : 'app-content-not-ready'} />;
}

function FilterIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-blue-700' : 'text-slate-400'}`}
    >
      <path d="M3 4.5a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 .53 1.28l-4.72 4.72v4.55a.75.75 0 0 1-1.06.67l-2.5-1.25A.75.75 0 0 1 8 13.25V9.25L3.22 4.53A.75.75 0 0 1 3 4.5Z" />
    </svg>
  );
}

function ColumnFilterInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={FILTER_INPUT_CLASS}
    />
  );
}

function ColumnFilterSelect({
  value,
  onChange,
}: {
  value: ShelterTypeFilterValue;
  onChange: (value: ShelterTypeFilterValue) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as ShelterTypeFilterValue)}
      className={FILTER_INPUT_CLASS}
      aria-label="災害種別で絞り込み"
    >
      <option value="all">すべて</option>
      <option value="yes">指定あり (✅)</option>
      <option value="no">指定なし (❌)</option>
    </select>
  );
}

function ColumnHeaderWithFilter({
  columnId,
  label,
  isOpen,
  isActive,
  isShelterType,
  isNameColumn,
  draftFilters,
  onToggle,
  onDraftFiltersChange,
}: {
  columnId: FilterableColumnId;
  label: string;
  isOpen: boolean;
  isActive: boolean;
  isShelterType: boolean;
  isNameColumn: boolean;
  draftFilters: ShelterColumnFilters;
  onToggle: () => void;
  onDraftFiltersChange: (filters: ShelterColumnFilters) => void;
}) {
  return (
    <div
      className={[
        'relative flex items-start gap-1 px-3 py-2 font-medium',
        isNameColumn ? NAME_HEADER_CLASS : '',
        isShelterType ? `${SHELTER_TYPE_COLUMN_CLASS} ${SHELTER_TYPE_HEADER_CLASS}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="columnheader"
    >
      <span
        className={['min-w-0 flex-1', isShelterType ? 'text-center' : ''].filter(Boolean).join(' ')}
      >
        {label}
      </span>
      <div className="relative shrink-0 self-start">
        <button
          type="button"
          data-filter-toggle
          onClick={onToggle}
          className={[
            'rounded p-0.5 transition-colors hover:bg-slate-200',
            isActive ? 'bg-blue-100' : '',
          ]
            .filter(Boolean)
            .join(' ')}
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
            {columnId === 'name' ? (
              <ColumnFilterInput
                value={draftFilters.name}
                placeholder="名前で絞り込み"
                onChange={(name) => onDraftFiltersChange({ ...draftFilters, name })}
              />
            ) : null}
            {columnId === 'address' ? (
              <ColumnFilterInput
                value={draftFilters.address}
                placeholder="住所で絞り込み"
                onChange={(address) => onDraftFiltersChange({ ...draftFilters, address })}
              />
            ) : null}
            {isShelterType ? (
              <ColumnFilterSelect
                value={draftFilters.types[columnId as ShelterTypeKey]}
                onChange={(value) =>
                  onDraftFiltersChange({
                    ...draftFilters,
                    types: { ...draftFilters.types, [columnId as ShelterTypeKey]: value },
                  })
                }
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function isFilterableColumnId(columnId: string): columnId is FilterableColumnId {
  return (
    columnId === 'name' ||
    columnId === 'address' ||
    shelterTypeKeys.includes(columnId as ShelterTypeKey)
  );
}

export function MapTable() {
  const { displayedShelters, updateColumnFilters } = useShelterMapContext();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [draftFilters, setDraftFilters] = useState<ShelterColumnFilters>(emptyShelterColumnFilters);
  const [openFilterColumn, setOpenFilterColumn] = useState<FilterableColumnId | null>(null);

  useDebouncedCallback(draftFilters, updateColumnFilters, DEBOUNCE_MS);

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
    () => [
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
          header: getShelterTypeTableLabel(key as ShelterTypeKey),
          cell: (info) => <ShelterTypeCell ready={info.getValue()} />,
        }),
      ),
    ],
    [],
  );

  const table = useReactTable({
    data: displayedShelters,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row, index) => `${row.name}-${row.latitude}-${row.longitude}-${index}`,
  });

  const { rows } = table.getRowModel();
  const shelterTypeKeySet = useMemo(() => new Set<string>(shelterTypeKeys), []);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_ESTIMATE_HEIGHT,
    overscan: 10,
  });

  const getCellClassName = (columnId: string) =>
    [
      'px-3 py-2',
      columnId === 'name' || columnId === 'address' ? 'break-words leading-snug' : '',
      columnId === 'name' ? NAME_COLUMN_CLASS : '',
      shelterTypeKeySet.has(columnId) ? SHELTER_TYPE_COLUMN_CLASS : '',
    ]
      .filter(Boolean)
      .join(' ');

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-4 text-sm text-slate-700">
        <p>一覧には地図の表示領域内の避難所のみを表示しています。</p>
        <div className="flex shrink-0 items-center gap-3">
          <p>
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
          <p className="tabular-nums font-medium text-slate-800">
            {displayedShelters.length.toLocaleString()} 件
          </p>
        </div>
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
                if (header.isPlaceholder || !isFilterableColumnId(header.column.id)) {
                  return null;
                }

                const columnId = header.column.id;
                const label = flexRender(header.column.columnDef.header, header.getContext());
                const isShelterType = shelterTypeKeySet.has(columnId);

                return (
                  <ColumnHeaderWithFilter
                    key={header.id}
                    columnId={columnId}
                    label={typeof label === 'string' ? label : String(label)}
                    isOpen={openFilterColumn === columnId}
                    isActive={isColumnFilterActive(columnId, draftFilters)}
                    isShelterType={isShelterType}
                    isNameColumn={columnId === 'name'}
                    draftFilters={draftFilters}
                    onToggle={() =>
                      setOpenFilterColumn((current) => (current === columnId ? null : columnId))
                    }
                    onDraftFiltersChange={setDraftFilters}
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
                    {row.getVisibleCells().map((cell) => (
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
