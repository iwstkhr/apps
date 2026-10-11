import type { Shelter } from '~/types/shelter';
import { type ShelterTypeKey, shelterTypeKeys } from '~/types/shelter-type';

export interface ShelterFilters {
  /** Whitespace-separated terms; each must appear in the name or the address. */
  keyword: string;
  /** Disaster types a shelter must be designated for (all of them). */
  types: readonly ShelterTypeKey[];
  /** Keep shelters that miss a selected type, so the map can show them dimmed. */
  showNonMatching: boolean;
  /** Limit the table to shelters inside the map viewport. */
  withinMapOnly: boolean;
}

export const emptyShelterFilters: ShelterFilters = {
  keyword: '',
  types: [],
  showNonMatching: false,
  withinMapOnly: false,
};

export function hasActiveShelterFilters(filters: ShelterFilters): boolean {
  return filters.keyword.trim() !== '' || filters.types.length > 0;
}

/** Toggle a disaster type, keeping the selection in the canonical `shelterTypeKeys` order. */
export function toggleShelterType(
  types: readonly ShelterTypeKey[],
  key: ShelterTypeKey,
): ShelterTypeKey[] {
  const selected = new Set(types);
  if (selected.has(key)) {
    selected.delete(key);
  } else {
    selected.add(key);
  }
  return shelterTypeKeys.filter((typeKey) => selected.has(typeKey));
}

export function matchesShelterTypes(shelter: Shelter, types: readonly ShelterTypeKey[]): boolean {
  return types.every((key) => shelter.type[key]);
}

export function filterShelters(shelters: Shelter[], filters: ShelterFilters): Shelter[] {
  const terms = filters.keyword.trim().split(/\s+/).filter(Boolean);
  const filterByTypes = filters.types.length > 0 && !filters.showNonMatching;

  if (terms.length === 0 && !filterByTypes) {
    return shelters;
  }

  return shelters.filter(
    (shelter) =>
      terms.every((term) => shelter.name.includes(term) || shelter.address.includes(term)) &&
      (!filterByTypes || matchesShelterTypes(shelter, filters.types)),
  );
}
