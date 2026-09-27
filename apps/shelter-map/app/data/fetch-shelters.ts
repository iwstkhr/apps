import { decompressGzipResponse } from '~/lib/decompress-gzip';
import { publicUrl } from '~/lib/public-url';
import { parseShelterGeoJson, type Shelter } from '~/types/shelter';

const SHELTERS_GEOJSON_URL = publicUrl('assets/mergeFromCity_2.geojson.gz');

let sheltersCache: Shelter[] | null = null;

export async function fetchShelters(): Promise<Shelter[]> {
  if (sheltersCache) {
    return sheltersCache;
  }

  const response = await fetch(SHELTERS_GEOJSON_URL);
  const geojsonText = await decompressGzipResponse(response);
  const geojson: unknown = JSON.parse(geojsonText);

  sheltersCache = parseShelterGeoJson(geojson);

  return sheltersCache;
}
