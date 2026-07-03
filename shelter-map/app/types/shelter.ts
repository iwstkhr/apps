import type { ShelterType } from '~/types/shelter-type'

export interface Shelter {
  name: string
  address: string
  type: ShelterType
  latitude: number
  longitude: number
  note: string
}

export interface ShelterGeoJsonProperties {
  NO: number
  共通ID: string
  都道府県名及び市町村名: string
  '施設・場所名': string
  住所: string
  洪水: string
  '崖崩れ、土石流及び地滑り': string
  高潮: string
  地震: string
  津波: string
  大規模な火事: string
  内水氾濫: string
  火山現象: string
  指定避難所との住所同一: string
  備考: string
}

export interface ShelterGeoJsonFeature {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
  properties: ShelterGeoJsonProperties
}

export interface ShelterGeoJsonFeatureCollection {
  type: 'FeatureCollection'
  name: string
  features: ShelterGeoJsonFeature[]
}

function isDesignated(value: string | undefined): boolean {
  return value === '1'
}

export function createShelterFromGeoJsonFeature(feature: ShelterGeoJsonFeature): Shelter | null {
  const [longitude, latitude] = feature.geometry.coordinates
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  const properties = feature.properties

  return {
    name: properties['施設・場所名'],
    address: properties.住所,
    type: {
      flood: isDesignated(properties.洪水),
      landslide: isDesignated(properties['崖崩れ、土石流及び地滑り']),
      storm_surge: isDesignated(properties.高潮),
      earthquake: isDesignated(properties.地震),
      tsunami: isDesignated(properties.津波),
      big_fire: isDesignated(properties.大規模な火事),
      flood_within_levee: isDesignated(properties.内水氾濫),
      volcanic_activity: isDesignated(properties.火山現象),
    },
    latitude,
    longitude,
    note: properties.備考 ?? '',
  }
}
