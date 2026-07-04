import { beforeEach, describe, expect, it, vi } from 'vitest';
import { decompressGzipResponse } from '~/lib/decompress-gzip';
import { createGeoJsonFeature } from '~/test/fixtures';
import type { ShelterGeoJsonFeature } from '~/types/shelter';

vi.mock('~/lib/decompress-gzip', () => ({
  decompressGzipResponse: vi.fn(),
}));

const fetchMock = vi.fn<typeof fetch>();

function mockGeoJsonResponse(features: ShelterGeoJsonFeature[]) {
  fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
  vi.mocked(decompressGzipResponse).mockResolvedValue(
    JSON.stringify({
      type: 'FeatureCollection',
      name: 'mergeFromCity_2',
      features,
    }),
  );
}

async function importFetchShelters() {
  const module = await import('~/data/fetch-shelters');
  return module.fetchShelters;
}

describe('fetchShelters', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    vi.mocked(decompressGzipResponse).mockReset();
  });

  it('fetches GeoJSON and maps Point features to shelters', async () => {
    mockGeoJsonResponse([
      createGeoJsonFeature(),
      createGeoJsonFeature({ '施設・場所名': '第二避難所' }),
    ]);
    const fetchShelters = await importFetchShelters();

    const shelters = await fetchShelters();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith('/assets/mergeFromCity_2.geojson.gz');
    expect(shelters).toHaveLength(2);
    expect(shelters[0]?.name).toBe('テスト避難所');
    expect(shelters[1]?.name).toBe('第二避難所');
  });

  it('ignores non-Point features and invalid coordinates', async () => {
    const polygonFeature = {
      ...createGeoJsonFeature({ '施設・場所名': 'ポリゴン' }),
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [139.6, 35.4],
            [139.7, 35.4],
            [139.7, 35.5],
            [139.6, 35.5],
            [139.6, 35.4],
          ],
        ],
      },
    } as unknown as ShelterGeoJsonFeature;

    const invalidPointFeature = createGeoJsonFeature({ '施設・場所名': '無効座標' });
    invalidPointFeature.geometry.coordinates = [Number.NaN, 35.4];

    mockGeoJsonResponse([createGeoJsonFeature(), polygonFeature, invalidPointFeature]);
    const fetchShelters = await importFetchShelters();

    const shelters = await fetchShelters();

    expect(shelters).toHaveLength(1);
    expect(shelters[0]?.name).toBe('テスト避難所');
  });

  it('returns cached shelters without fetching again', async () => {
    mockGeoJsonResponse([createGeoJsonFeature()]);
    const fetchShelters = await importFetchShelters();

    const first = await fetchShelters();
    const second = await fetchShelters();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(second).toBe(first);
  });
});
