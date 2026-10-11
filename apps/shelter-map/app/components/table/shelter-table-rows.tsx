import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef } from 'react';
import { cn } from '~/lib/cn';
import type { Shelter } from '~/types/shelter';
import { shelterTypeKeys } from '~/types/shelter-type';
import { SHELTER_TABLE_GRID_TEMPLATE, SHELTER_TYPE_COLUMN_CLASS } from './shelter-table-layout';

const ROW_ESTIMATE_HEIGHT = 56;
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
}: {
  shelters: Shelter[];
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  selectedShelterId?: Shelter['id'] | null;
  onSelect?: (shelter: Shelter) => void;
}) {
  const rowVirtualizer = useVirtualizer({
    count: shelters.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_ESTIMATE_HEIGHT,
    overscan: 10,
  });

  // Scroll only when the selection changes, not whenever the list changes while the map moves.
  const sheltersRef = useRef(shelters);
  sheltersRef.current = shelters;
  useEffect(() => {
    if (!selectedShelterId) {
      return;
    }
    const index = sheltersRef.current.findIndex((shelter) => shelter.id === selectedShelterId);
    if (index >= 0) {
      rowVirtualizer.scrollToIndex(index, { align: 'auto' });
    }
  }, [selectedShelterId, rowVirtualizer]);

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
              'group absolute left-0 top-0 grid w-full cursor-pointer border-t border-slate-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600',
              selected ? 'bg-blue-100' : ROW_BACKGROUND_CLASS,
            )}
            style={{
              gridTemplateColumns: SHELTER_TABLE_GRID_TEMPLATE,
              transform: `translateY(${virtualRow.start}px)`,
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
                <span
                  className={shelter.type[key] ? 'app-content-ready' : 'app-content-not-ready'}
                />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
