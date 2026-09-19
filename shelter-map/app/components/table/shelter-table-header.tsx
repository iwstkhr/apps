import { ColumnHeaderWithFilter } from '~/components/table/column-header-filter';
import { SHELTER_TABLE_GRID_TEMPLATE } from '~/components/table/shelter-table-layout';
import { cn } from '~/lib/cn';
import type { ShelterColumnFilters, ShelterFilterColumnId } from '~/types/shelter-filters';
import { getShelterTypeTableLabel, isShelterTypeKey, shelterTypeKeys } from '~/types/shelter-type';

const SHELTER_TYPE_COLUMN_CLASS = 'px-1 text-center';
const SHELTER_TYPE_HEADER_CLASS = 'text-xs leading-snug';
const NAME_HEADER_CLASS = 'sticky left-0 z-10 bg-slate-100';

const headerColumns: ReadonlyArray<{ id: ShelterFilterColumnId; label: string }> = [
  { id: 'name', label: '名前' },
  { id: 'address', label: '住所' },
  ...shelterTypeKeys.map((id) => ({ id, label: getShelterTypeTableLabel(id) })),
];

function getHeaderClassName(columnId: ShelterFilterColumnId): string {
  return cn(
    columnId === 'name' && NAME_HEADER_CLASS,
    isShelterTypeKey(columnId) && `${SHELTER_TYPE_COLUMN_CLASS} ${SHELTER_TYPE_HEADER_CLASS}`,
  );
}

export function ShelterTableHeader({
  filters,
  openFilterColumn,
  onToggleFilter,
  onFiltersChange,
}: {
  filters: ShelterColumnFilters;
  openFilterColumn: ShelterFilterColumnId | null;
  onToggleFilter: (columnId: ShelterFilterColumnId) => void;
  onFiltersChange: (filters: ShelterColumnFilters) => void;
}) {
  return (
    <div
      className="sticky top-0 z-20 grid border-b border-slate-300 bg-slate-100 text-slate-900"
      style={{ gridTemplateColumns: SHELTER_TABLE_GRID_TEMPLATE }}
      role="row"
    >
      {headerColumns.map(({ id, label }) => (
        <ColumnHeaderWithFilter
          key={id}
          columnId={id}
          label={label}
          className={getHeaderClassName(id)}
          isOpen={openFilterColumn === id}
          filters={filters}
          onToggle={() => onToggleFilter(id)}
          onFiltersChange={onFiltersChange}
        />
      ))}
    </div>
  );
}
