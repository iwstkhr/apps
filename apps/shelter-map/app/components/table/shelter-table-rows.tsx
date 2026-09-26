import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '~/lib/cn';
import type { Shelter } from '~/types/shelter';
import { isShelterTypeKey, shelterTypeKeys } from '~/types/shelter-type';
import { SHELTER_TABLE_GRID_TEMPLATE } from './shelter-table-layout';

const ROW_ESTIMATE_HEIGHT = 56;
const SHELTER_TYPE_COLUMN_CLASS = 'px-1 text-center';
const NAME_COLUMN_CLASS =
  'sticky left-0 z-10 bg-white group-hover:bg-blue-50 group-odd:bg-white group-even:bg-slate-50 group-even:group-hover:bg-blue-50';

function ShelterTypeCell({ ready }: { ready: boolean }) {
  return <span className={ready ? 'app-content-ready' : 'app-content-not-ready'} />;
}

function getCellClassName(columnId: string): string {
  return cn(
    'px-3 py-2',
    (columnId === 'name' || columnId === 'address') && 'break-words leading-snug',
    columnId === 'name' && NAME_COLUMN_CLASS,
    isShelterTypeKey(columnId) && SHELTER_TYPE_COLUMN_CLASS,
  );
}

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
            <div className={getCellClassName('name')} role="cell">
              {shelter.name}
            </div>
            <div className={getCellClassName('address')} role="cell">
              {shelter.address}
            </div>
            {shelterTypeKeys.map((key) => (
              <div key={key} className={getCellClassName(key)} role="cell">
                <ShelterTypeCell ready={shelter.type[key]} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
