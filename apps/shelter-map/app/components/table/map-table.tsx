import { useRef } from 'react';
import { ShelterTableHeader } from '~/components/table/shelter-table-header';
import { ShelterTableRows } from '~/components/table/shelter-table-rows';
import { useElementHeight } from '~/hooks/use-element-height';
import { LG_MEDIA_QUERY, SM_MEDIA_QUERY, useMediaQuery } from '~/hooks/use-media-query';
import { cn } from '~/lib/cn';
import type { Shelter } from '~/types/shelter';

interface MapTableProps {
  /** Shelters that pass the filters. */
  shelters: Shelter[];
  /** The filtered shelters inside the map viewport. */
  visibleShelters?: Shelter[];
  withinMapOnly?: boolean;
  onWithinMapOnlyChange?: (withinMapOnly: boolean) => void;
  selectedShelterId?: Shelter['id'] | null;
  onSelect?: (shelter: Shelter) => void;
  /** False while the list is hidden (the map tab on phones, or collapsed beside the map). */
  visible?: boolean;
}

export function MapTable({
  shelters,
  visibleShelters = shelters,
  withinMapOnly = false,
  onWithinMapOnlyChange,
  selectedShelterId,
  onSelect,
  visible = true,
}: MapTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rows = withinMapOnly ? visibleShelters : shelters;
  // The wide table fits only between the breakpoints. Phones and the narrow sidebar beside the
  // map on wide screens show each shelter as a card instead.
  const isSm = useMediaQuery(SM_MEDIA_QUERY, true);
  const isLg = useMediaQuery(LG_MEDIA_QUERY);
  const layout = isSm && !isLg ? 'table' : 'card';
  const headerRef = useRef<HTMLDivElement>(null);
  const headerHeight = useElementHeight(headerRef, layout === 'table');

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-slate-700">
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
        <p className="ml-auto tabular-nums text-slate-600">
          <span className="font-medium text-slate-800">{rows.length.toLocaleString()} 件</span>
          {withinMapOnly && <span> / 該当 {shelters.length.toLocaleString()} 件</span>}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
        <div ref={tableContainerRef} className="min-h-0 flex-1 overflow-auto">
          <div
            className={cn(
              'text-left text-sm text-slate-800',
              layout === 'table' && 'min-w-[58rem]',
            )}
            role="table"
            aria-label="避難場所の一覧"
          >
            {layout === 'table' && <ShelterTableHeader ref={headerRef} />}
            <ShelterTableRows
              shelters={rows}
              scrollContainerRef={tableContainerRef}
              selectedShelterId={selectedShelterId}
              onSelect={onSelect}
              layout={layout}
              // Ignore a height measured just before the header was removed (card layout).
              stickyHeaderHeight={layout === 'table' ? headerHeight : 0}
              visible={visible}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
