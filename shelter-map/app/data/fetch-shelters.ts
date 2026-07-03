import { decompressGzipResponse } from '~/lib/decompress-gzip'
import {
  createShelterFromGeoJsonFeature,
  type Shelter,
  type ShelterGeoJsonFeatureCollection,
} from '~/types/shelter'

const SHELTERS_GEOJSON_URL = `${import.meta.env.BASE_URL}assets/mergeFromCity_2.geojson.gz`

let sheltersCache: Shelter[] | null = null

export async function fetchShelters(): Promise<Shelter[]> {
  if (sheltersCache) {
    return sheltersCache
  }

  const response = await fetch(SHELTERS_GEOJSON_URL)
  const geojsonText = await decompressGzipResponse(response)
  const geojson = JSON.parse(geojsonText) as ShelterGeoJsonFeatureCollection

  sheltersCache = geojson.features
    .filter((feature) => feature.geometry?.type === 'Point')
    .map(createShelterFromGeoJsonFeature)
    .filter((shelter): shelter is Shelter => shelter != null)

  return sheltersCache
}
