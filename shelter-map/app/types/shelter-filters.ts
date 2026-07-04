import type { Shelter } from '~/types/shelter';
import { type ShelterTypeKey, shelterTypeKeys } from '~/types/shelter-type';

export type ShelterTypeFilterValue = 'all' | 'yes' | 'no';

export interface ShelterColumnFilters {
  name: string;
  address: string;
  types: Record<ShelterTypeKey, ShelterTypeFilterValue>;
}

export function createEmptyShelterTypeFilters(): Record<ShelterTypeKey, ShelterTypeFilterValue> {
  return Object.fromEntries(shelterTypeKeys.map((key) => [key, 'all'])) as Record<
    ShelterTypeKey,
    ShelterTypeFilterValue
  >;
}

export const emptyShelterColumnFilters: ShelterColumnFilters = {
  name: '',
  address: '',
  types: createEmptyShelterTypeFilters(),
};

function hasActiveShelterTypeFilters(
  types: Record<ShelterTypeKey, ShelterTypeFilterValue>,
): boolean {
  return shelterTypeKeys.some((key) => types[key] !== 'all');
}

export function isColumnFilterActive(columnId: string, filters: ShelterColumnFilters): boolean {
  if (columnId === 'name') {
    return filters.name.trim() !== '';
  }
  if (columnId === 'address') {
    return filters.address.trim() !== '';
  }
  if (shelterTypeKeys.includes(columnId as ShelterTypeKey)) {
    return filters.types[columnId as ShelterTypeKey] !== 'all';
  }
  return false;
}

export function filterSheltersByColumns(
  shelters: Shelter[],
  filters: ShelterColumnFilters,
): Shelter[] {
  const name = filters.name.trim();
  const address = filters.address.trim();
  const hasTypeFilters = hasActiveShelterTypeFilters(filters.types);

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
      if (typeFilter === 'yes' && !shelter.type[key]) {
        return false;
      }
      if (typeFilter === 'no' && shelter.type[key]) {
        return false;
      }
    }

    return true;
  });
}
