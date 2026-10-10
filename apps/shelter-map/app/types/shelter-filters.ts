import type { Shelter } from '~/types/shelter';
import { isShelterTypeKey, type ShelterTypeKey, shelterTypeKeys } from '~/types/shelter-type';

export type ShelterTypeFilterValue = 'all' | 'yes' | 'no';

type ShelterTypeFilters = Record<ShelterTypeKey, ShelterTypeFilterValue>;

export interface ShelterColumnFilters {
  name: string;
  address: string;
  types: ShelterTypeFilters;
}

export const emptyShelterColumnFilters: ShelterColumnFilters = {
  name: '',
  address: '',
  types: Object.fromEntries(shelterTypeKeys.map((key) => [key, 'all'])) as ShelterTypeFilters,
};

export type ShelterFilterColumnId = 'name' | 'address' | ShelterTypeKey;

export function isColumnFilterActive(
  columnId: ShelterFilterColumnId,
  filters: ShelterColumnFilters,
): boolean {
  if (isShelterTypeKey(columnId)) {
    return filters.types[columnId] !== 'all';
  }
  return filters[columnId].trim() !== '';
}

export function filterSheltersByColumns(
  shelters: Shelter[],
  filters: ShelterColumnFilters,
): Shelter[] {
  const name = filters.name.trim();
  const address = filters.address.trim();
  const hasTypeFilters = shelterTypeKeys.some((key) => filters.types[key] !== 'all');

  if (!name && !address && !hasTypeFilters) {
    return shelters;
  }

  return shelters.filter((shelter) => {
    if (name && !shelter.name.includes(name)) {
      return false;
    }
    if (address && !shelter.address.includes(address)) {
      return false;
    }

    for (const key of shelterTypeKeys) {
      const typeFilter = filters.types[key];
      if (typeFilter !== 'all' && (typeFilter === 'yes') !== shelter.type[key]) {
        return false;
      }
    }

    return true;
  });
}
