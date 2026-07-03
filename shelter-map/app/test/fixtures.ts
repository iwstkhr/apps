import type { Shelter, ShelterGeoJsonFeature } from '~/types/shelter'

export function createGeoJsonFeature(
  overrides: Partial<ShelterGeoJsonFeature['properties']> = {},
): ShelterGeoJsonFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [139.6, 35.4],
    },
    properties: {
      NO: 1,
      共通ID: 'test-id',
      都道府県名及び市町村名: '神奈川県横浜市',
      '施設・場所名': 'テスト避難所',
      住所: '神奈川県横浜市',
      洪水: '1',
      '崖崩れ、土石流及び地滑り': '0',
      高潮: '0',
      地震: '1',
      津波: '0',
      大規模な火事: '0',
      内水氾濫: '0',
      火山現象: '0',
      指定避難所との住所同一: '0',
      備考: 'テスト備考',
      ...overrides,
    },
  }
}

export function createShelter(overrides: Partial<Shelter> = {}): Shelter {
  return {
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
    note: '',
    ...overrides,
  }
}
