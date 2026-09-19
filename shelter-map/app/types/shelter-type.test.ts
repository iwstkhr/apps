import { describe, expect, it } from 'vitest';
import {
  getShelterTypeTableLabel,
  isShelterTypeKey,
  ShelterTypeEnum,
  ShelterTypeJapanese,
  shelterTypeKeys,
} from '~/types/shelter-type';

describe('getShelterTypeTableLabel', () => {
  it('abbreviates landslide for table headers', () => {
    expect(getShelterTypeTableLabel(ShelterTypeEnum.Landslide)).toBe('崖崩れ');
  });

  it('abbreviates big fire for table headers', () => {
    expect(getShelterTypeTableLabel(ShelterTypeEnum.BigFire)).toBe('火事');
  });

  it('returns the full Japanese label for other types', () => {
    expect(getShelterTypeTableLabel(ShelterTypeEnum.Flood)).toBe('洪水');
    expect(getShelterTypeTableLabel(ShelterTypeEnum.Earthquake)).toBe('地震');
  });

  it('returns a non-empty label for every disaster type', () => {
    for (const key of shelterTypeKeys) {
      expect(ShelterTypeJapanese[key]).not.toBe('');
      expect(getShelterTypeTableLabel(key)).not.toBe('');
    }
  });
});

describe('isShelterTypeKey', () => {
  it('accepts every disaster type key', () => {
    for (const key of shelterTypeKeys) {
      expect(isShelterTypeKey(key)).toBe(true);
    }
  });

  it('rejects other column ids', () => {
    expect(isShelterTypeKey('name')).toBe(false);
    expect(isShelterTypeKey('address')).toBe(false);
    expect(isShelterTypeKey('')).toBe(false);
  });
});
