import { describe, expect, it } from 'vitest';
import { createGeoJsonFeature } from '~/test/fixtures';
import { createShelterFromGeoJsonFeature } from '~/types/shelter';

describe('createShelterFromGeoJsonFeature', () => {
  it('maps GeoJSON properties to a shelter', () => {
    const shelter = createShelterFromGeoJsonFeature(createGeoJsonFeature());

    expect(shelter).toEqual({
      id: 'test-id',
      name: 'テスト避難所',
      address: '神奈川県横浜市',
      type: {
        flood: true,
        landslide: false,
        storm_surge: false,
        earthquake: true,
        tsunami: false,
        big_fire: false,
        flood_within_levee: false,
        volcanic_activity: false,
      },
      latitude: 35.4,
      longitude: 139.6,
    });
  });

  it('returns null when coordinates are invalid', () => {
    const feature = createGeoJsonFeature();
    feature.geometry.coordinates = [Number.NaN, 35.4];

    expect(createShelterFromGeoJsonFeature(feature)).toBeNull();
  });

  it('treats only "1" as designated for disaster types', () => {
    const shelter = createShelterFromGeoJsonFeature(
      createGeoJsonFeature({
        洪水: '0',
        津波: '2',
      }),
    );

    expect(shelter?.type.flood).toBe(false);
    expect(shelter?.type.tsunami).toBe(false);
  });

  it('reads each disaster type from its own GeoJSON property', () => {
    const shelter = createShelterFromGeoJsonFeature(
      createGeoJsonFeature({
        洪水: '0',
        '崖崩れ、土石流及び地滑り': '1',
        高潮: '1',
        地震: '0',
        津波: '1',
        大規模な火事: '1',
        内水氾濫: '1',
        火山現象: '1',
      }),
    );

    expect(shelter?.type).toEqual({
      flood: false,
      landslide: true,
      storm_surge: true,
      earthquake: false,
      tsunami: true,
      big_fire: true,
      flood_within_levee: true,
      volcanic_activity: true,
    });
  });
});
