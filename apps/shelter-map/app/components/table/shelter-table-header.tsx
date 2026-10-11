import {
  SHELTER_TABLE_GRID_TEMPLATE,
  SHELTER_TYPE_COLUMN_CLASS,
} from '~/components/table/shelter-table-layout';
import { cn } from '~/lib/cn';
import { getShelterTypeTableLabel, shelterTypeKeys } from '~/types/shelter-type';

const HEADER_CELL_CLASS = 'px-3 py-2 font-medium';
const SHELTER_TYPE_HEADER_CLASS = `${SHELTER_TYPE_COLUMN_CLASS} text-xs leading-snug`;
const NAME_HEADER_CLASS = 'sticky left-0 z-10 bg-slate-100';

export function ShelterTableHeader() {
  return (
    <div
      className="sticky top-0 z-20 grid border-b border-slate-300 bg-slate-100 text-slate-900"
      style={{ gridTemplateColumns: SHELTER_TABLE_GRID_TEMPLATE }}
      role="row"
    >
      <div className={cn(HEADER_CELL_CLASS, NAME_HEADER_CLASS)} role="columnheader">
        名前
      </div>
      <div className={HEADER_CELL_CLASS} role="columnheader">
        住所
      </div>
      {shelterTypeKeys.map((key) => (
        <div
          key={key}
          className={cn(HEADER_CELL_CLASS, SHELTER_TYPE_HEADER_CLASS)}
          role="columnheader"
        >
          {getShelterTypeTableLabel(key)}
        </div>
      ))}
    </div>
  );
}
