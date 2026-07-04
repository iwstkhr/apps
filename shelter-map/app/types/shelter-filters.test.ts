import { describe, expect, it } from 'vitest';
import { createShelter } from '~/test/fixtures';
import {
  emptyShelterColumnFilters,
  filterSheltersByColumns,
  isColumnFilterActive,
} from '~/types/shelter-filters';

const sampleShelter = createShelter();

describe('isColumnFilterActive', () => {
  it('returns false when no filters are set', () => {
    expect(isColumnFilterActive('name', emptyShelterColumnFilters)).toBe(false);
    expect(isColumnFilterActive('flood', emptyShelterColumnFilters)).toBe(false);
  });

  it('returns true when a text or type filter is active', () => {
    expect(isColumnFilterActive('name', { ...emptyShelterColumnFilters, name: 'テスト' })).toBe(
      true,
    );
    expect(
      isColumnFilterActive('flood', {
        ...emptyShelterColumnFilters,
        types: { ...emptyShelterColumnFilters.types, flood: 'yes' },
      }),
    ).toBe(true);
  });
});

describe('filterSheltersByColumns', () => {
  const shelters = [sampleShelter];

  it('returns all shelters when filters are empty', () => {
    expect(filterSheltersByColumns(shelters, emptyShelterColumnFilters)).toEqual(shelters);
  });

  it('filters by name, address, and disaster type', () => {
    expect(
      filterSheltersByColumns(shelters, { ...emptyShelterColumnFilters, name: 'テスト' }),
    ).toEqual(shelters);
    expect(
      filterSheltersByColumns(shelters, { ...emptyShelterColumnFilters, name: '存在しない' }),
    ).toEqual([]);
    expect(
      filterSheltersByColumns(shelters, {
        ...emptyShelterColumnFilters,
        types: { ...emptyShelterColumnFilters.types, flood: 'yes' },
      }),
    ).toEqual(shelters);
    expect(
      filterSheltersByColumns(shelters, {
        ...emptyShelterColumnFilters,
        types: { ...emptyShelterColumnFilters.types, landslide: 'yes' },
      }),
    ).toEqual([]);
    expect(
      filterSheltersByColumns(shelters, {
        ...emptyShelterColumnFilters,
        address: '横浜',
      }),
    ).toEqual(shelters);
    expect(
      filterSheltersByColumns(shelters, {
        ...emptyShelterColumnFilters,
        types: { ...emptyShelterColumnFilters.types, earthquake: 'no' },
      }),
    ).toEqual([]);
  });
});
