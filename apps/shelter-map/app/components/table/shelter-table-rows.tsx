import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef } from 'react';
import { ShelterTypeDot } from '~/components/shelter/shelter-type-dot';
import { cn } from '~/lib/cn';
import type { Shelter } from '~/types/shelter';
import {
  getShelterTypeTableLabel,
  SHELTER_TYPE_COLORS,
  shelterTypeKeys,
} from '~/types/shelter-type';
import { SHELTER_TABLE_GRID_TEMPLATE, SHELTER_TYPE_COLUMN_CLASS } from './shelter-table-layout';

export type ShelterRowLayout = 'table' | 'card';

const ROW_ESTIMATE_HEIGHTS: Record<ShelterRowLayout, number> = { table: 56, card: 84 };
const ROW_CLASS =
  'group absolute left-0 top-0 w-full cursor-pointer border-t border-slate-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600';
const ADDRESS_CELL_CLASS = 'px-3 py-2 break-words leading-snug';
const NAME_CELL_CLASS = `${ADDRESS_CELL_CLASS} sticky left-0 z-10 font-medium`;
const NAME_CELL_BACKGROUND_CLASS =
  'bg-white group-hover:bg-blue-50 group-odd:bg-white group-even:bg-slate-50 group-even:group-hover:bg-blue-50';
const ROW_BACKGROUND_CLASS = 'odd:bg-white even:bg-slate-50 hover:bg-blue-50';
const SHELTER_TYPE_CELL_CLASS = `px-3 py-2 ${SHELTER_TYPE_COLUMN_CLASS}`;

export function ShelterTableRows({
  shelters,
  scrollContainerRef,
  selectedShelterId = null,
  onSelect,
  layout = 'table',
  stickyHeaderHeight = 0,
  visible = true,
}: {
  shelters: Shelter[];
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  selectedShelterId?: Shelter['id'] | null;
  onSelect?: (shelter: Shelter) => void;
  layout?: ShelterRowLayout;
  /** Height of the sticky header above the rows inside the same scroll container. */
  stickyHeaderHeight?: number;
  /** False while the list is hidden (the map tab on phones); it scrolls once shown again. */
  visible?: boolean;
}) {
  const rowVirtualizer = useVirtualizer({
    count: shelters.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_ESTIMATE_HEIGHTS[layout],
    overscan: 10,
    // The rows start below the sticky header, which also covers the top of the viewport.
    // Without both, scrolling to a row lands it under the header or past the bottom edge.
    scrollMargin: stickyHeaderHeight,
    scrollPaddingStart: stickyHeaderHeight,
  });

  // Scroll only when the selection changes, not whenever the list changes while the map moves.
  const sheltersRef = useRef(shelters);
  sheltersRef.current = shelters;
  useEffect(() => {
    if (!selectedShelterId || !visible) {
      return;
    }
    const index = sheltersRef.current.findIndex((shelter) => shelter.id === selectedShelterId);
    if (index >= 0) {
      rowVirtualizer.scrollToIndex(index, { align: 'auto' });
    }
  }, [selectedShelterId, visible, rowVirtualizer]);

  return (
    <div
      role="rowgroup"
      style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}
    >
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const shelter = shelters[virtualRow.index];
        if (!shelter) {
          return null;
        }

        const selected = shelter.id === selectedShelterId;

        return (
          <div
            key={shelter.id}
            data-index={virtualRow.index}
            ref={rowVirtualizer.measureElement}
            className={cn(
              ROW_CLASS,
              layout === 'table' ? 'grid' : 'px-3 py-2.5',
              selected ? 'bg-blue-100' : ROW_BACKGROUND_CLASS,
            )}
            style={{
              gridTemplateColumns: layout === 'table' ? SHELTER_TABLE_GRID_TEMPLATE : undefined,
              transform: `translateY(${virtualRow.start - stickyHeaderHeight}px)`,
            }}
            role="row"
            tabIndex={0}
            aria-current={selected || undefined}
            title="地図で表示"
            onClick={() => onSelect?.(shelter)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect?.(shelter);
              }
            }}
          >
            {layout === 'table' ? (
              <ShelterTableCells shelter={shelter} selected={selected} />
            ) : (
              <ShelterCardCells shelter={shelter} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ShelterTableCells({ shelter, selected }: { shelter: Shelter; selected: boolean }) {
  return (
    <>
      <div
        className={cn(NAME_CELL_CLASS, selected ? 'bg-blue-100' : NAME_CELL_BACKGROUND_CLASS)}
        role="cell"
      >
        {shelter.name}
      </div>
      <div className={ADDRESS_CELL_CLASS} role="cell">
        {shelter.address}
      </div>
      {shelterTypeKeys.map((key) => (
        <div key={key} className={SHELTER_TYPE_CELL_CLASS} role="cell">
          {shelter.type[key] ? (
            <span
              className="app-content-ready"
              style={{ '--type-color': SHELTER_TYPE_COLORS[key] } as React.CSSProperties}
            />
          ) : (
            <span className="app-content-not-ready" />
          )}
        </div>
      ))}
    </>
  );
}

function ShelterCardCells({ shelter }: { shelter: Shelter }) {
  const designatedTypes = shelterTypeKeys.filter((key) => shelter.type[key]);

  return (
    <>
      <div className="font-medium leading-snug text-slate-900" role="cell">
        {shelter.name}
      </div>
      <div className="mt-0.5 text-xs leading-snug text-slate-600" role="cell">
        {shelter.address}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1" role="cell">
        {designatedTypes.length > 0 ? (
          designatedTypes.map((key) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200"
            >
              <ShelterTypeDot typeKey={key} />
              {getShelterTypeTableLabel(key)}
            </span>
          ))
        ) : (
          <span className="text-[11px] text-slate-400">指定なし</span>
        )}
      </div>
    </>
  );
}
