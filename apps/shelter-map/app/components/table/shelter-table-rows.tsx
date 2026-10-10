import { useVirtualizer } from '@tanstack/react-virtual';
import type { Shelter } from '~/types/shelter';
import { shelterTypeKeys } from '~/types/shelter-type';
import { SHELTER_TABLE_GRID_TEMPLATE, SHELTER_TYPE_COLUMN_CLASS } from './shelter-table-layout';

const ROW_ESTIMATE_HEIGHT = 56;
const ADDRESS_CELL_CLASS = 'px-3 py-2 break-words leading-snug';
const NAME_CELL_CLASS = `${ADDRESS_CELL_CLASS} sticky left-0 z-10 bg-white group-hover:bg-blue-50 group-odd:bg-white group-even:bg-slate-50 group-even:group-hover:bg-blue-50`;
const SHELTER_TYPE_CELL_CLASS = `px-3 py-2 ${SHELTER_TYPE_COLUMN_CLASS}`;

export function ShelterTableRows({
  shelters,
  scrollContainerRef,
}: {
  shelters: Shelter[];
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const rowVirtualizer = useVirtualizer({
    count: shelters.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_ESTIMATE_HEIGHT,
    overscan: 10,
  });

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

        return (
          <div
            key={shelter.id}
            data-index={virtualRow.index}
            ref={rowVirtualizer.measureElement}
            className="group absolute left-0 top-0 grid w-full border-t border-slate-200 odd:bg-white even:bg-slate-50 hover:bg-blue-50"
            style={{
              gridTemplateColumns: SHELTER_TABLE_GRID_TEMPLATE,
              transform: `translateY(${virtualRow.start}px)`,
            }}
            role="row"
          >
            <div className={NAME_CELL_CLASS} role="cell">
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
