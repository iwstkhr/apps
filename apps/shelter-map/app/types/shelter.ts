import { type ShelterType, ShelterTypeJapanese, shelterTypeKeys } from '~/types/shelter-type';

export interface Shelter {
  id: string;
  name: string;
  address: string;
  type: ShelterType;
  latitude: number;
  longitude: number;
}

export interface ShelterGeoJsonProperties {
  NO: number;
  共通ID: string;
  都道府県名及び市町村名: string;
  '施設・場所名': string;
  住所: string;
  洪水: string;
  '崖崩れ、土石流及び地滑り': string;
  高潮: string;
  地震: string;
  津波: string;
  大規模な火事: string;
  内水氾濫: string;
  火山現象: string;
  指定避難所との住所同一: string;
  備考: string;
}

export interface ShelterGeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: ShelterGeoJsonProperties;
}

function isDesignated(value: string | undefined): boolean {
  return value === '1';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function createShelterFromGeoJsonFeature(feature: unknown): Shelter | null {
  if (!isRecord(feature) || feature.type !== 'Feature') {
    return null;
  }

  const { geometry, properties } = feature;
  if (
    !isRecord(geometry) ||
    geometry.type !== 'Point' ||
    !Array.isArray(geometry.coordinates) ||
    !isRecord(properties)
  ) {
    return null;
  }

  const [longitude, latitude] = geometry.coordinates;
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  const id = properties.共通ID;
  const name = properties['施設・場所名'];
  const address = properties.住所;
  if (
    typeof id !== 'string' ||
    typeof name !== 'string' ||
    typeof address !== 'string' ||
    !shelterTypeKeys.every((key) => typeof properties[ShelterTypeJapanese[key]] === 'string')
  ) {
    return null;
  }

  return {
    id,
    name,
    address,
    type: Object.fromEntries(
      shelterTypeKeys.map((key) => {
        const value = properties[ShelterTypeJapanese[key]];
        return [key, isDesignated(typeof value === 'string' ? value : undefined)];
      }),
    ) as ShelterType,
    latitude,
    longitude,
  };
}

export function parseShelterGeoJson(value: unknown): Shelter[] {
  if (!isRecord(value) || value.type !== 'FeatureCollection' || !Array.isArray(value.features)) {
    throw new Error('Invalid shelter GeoJSON: expected a FeatureCollection with a features array');
  }

  return value.features
    .map(createShelterFromGeoJsonFeature)
    .filter((shelter): shelter is Shelter => shelter !== null);
}
