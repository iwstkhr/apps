import { describe, expect, it } from 'vitest';
import { createShelter } from '~/test/fixtures';
import {
  emptyShelterFilters,
  filterShelters,
  hasActiveShelterFilters,
  matchesShelterTypes,
  toggleShelterType,
} from '~/types/shelter-filters';

const yokohama = createShelter({ id: 'yokohama', name: '横浜小学校', address: '神奈川県横浜市' });
const kawasaki = createShelter({
  id: 'kawasaki',
  name: '川崎公園',
  address: '神奈川県川崎市',
  type: { ...createShelter().type, flood: false, tsunami: true },
});
const shelters = [yokohama, kawasaki];

describe('hasActiveShelterFilters', () => {
  it('ignores whitespace-only keywords and display options', () => {
    expect(hasActiveShelterFilters(emptyShelterFilters)).toBe(false);
    expect(
      hasActiveShelterFilters({
        ...emptyShelterFilters,
        keyword: '  ',
        showNonMatching: true,
        withinMapOnly: true,
      }),
    ).toBe(false);
  });

  it('returns true when a keyword or a disaster type is set', () => {
    expect(hasActiveShelterFilters({ ...emptyShelterFilters, keyword: '横浜' })).toBe(true);
    expect(hasActiveShelterFilters({ ...emptyShelterFilters, types: ['flood'] })).toBe(true);
  });
});

describe('toggleShelterType', () => {
  it('adds and removes a type in the canonical order', () => {
    expect(toggleShelterType(['tsunami'], 'flood')).toEqual(['flood', 'tsunami']);
    expect(toggleShelterType(['flood', 'tsunami'], 'flood')).toEqual(['tsunami']);
  });
});

describe('matchesShelterTypes', () => {
  it('requires every selected type', () => {
    expect(matchesShelterTypes(yokohama, [])).toBe(true);
    expect(matchesShelterTypes(yokohama, ['flood', 'earthquake'])).toBe(true);
    expect(matchesShelterTypes(yokohama, ['flood', 'tsunami'])).toBe(false);
  });
});

describe('filterShelters', () => {
  it('returns the same array when no filter is set', () => {
    expect(filterShelters(shelters, emptyShelterFilters)).toBe(shelters);
  });

  it('matches every keyword term against the name or the address', () => {
    expect(filterShelters(shelters, { ...emptyShelterFilters, keyword: ' 川崎 ' })).toEqual([
      kawasaki,
    ]);
    expect(
      filterShelters(shelters, { ...emptyShelterFilters, keyword: '神奈川県 小学校' }),
    ).toEqual([yokohama]);
    expect(filterShelters(shelters, { ...emptyShelterFilters, keyword: '存在しない' })).toEqual([]);
  });

  it('filters by disaster types with AND', () => {
    expect(filterShelters(shelters, { ...emptyShelterFilters, types: ['earthquake'] })).toEqual(
      shelters,
    );
    expect(
      filterShelters(shelters, { ...emptyShelterFilters, types: ['earthquake', 'tsunami'] }),
    ).toEqual([kawasaki]);
  });

  it('keeps shelters that miss a selected type when showNonMatching is on', () => {
    expect(
      filterShelters(shelters, {
        ...emptyShelterFilters,
        types: ['tsunami'],
        showNonMatching: true,
      }),
    ).toEqual(shelters);
  });
});
