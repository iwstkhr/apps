import { describe, expect, it } from 'vitest';
import { getShelterTypeTableLabel, ShelterTypeEnum } from '~/types/shelter-type';

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
});
