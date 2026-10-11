import { gzipSync } from 'node:zlib';
import { test as base, expect, type Page } from '@playwright/test';
import type { ShelterGeoJsonFeature, ShelterGeoJsonProperties } from '../app/types/shelter';

export type Options = {
  /** fixture: serve only SHELTERS below / real: use the real data in the repository */
  dataset: 'fixture' | 'real';
};

type Designations = Partial<
  Pick<
    ShelterGeoJsonProperties,
    | '洪水'
    | '崖崩れ、土石流及び地滑り'
    | '高潮'
    | '地震'
    | '津波'
    | '大規模な火事'
    | '内水氾濫'
    | '火山現象'
  >
>;

export function feature(
  id: string,
  name: string,
  address: string,
  [longitude, latitude]: [number, number],
  designations: Designations,
): ShelterGeoJsonFeature {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [longitude, latitude] },
    properties: {
      NO: Number(id),
      共通ID: id,
      都道府県名及び市町村名: address,
      '施設・場所名': name,
      住所: address,
      洪水: '',
      '崖崩れ、土石流及び地滑り': '',
      高潮: '',
      地震: '',
      津波: '',
      大規模な火事: '',
      内水氾濫: '',
      火山現象: '',
      指定避難所との住所同一: '',
      備考: '',
      ...designations,
    },
  };
}

/** All placed within the initial view (around Kanto, zoom 8). */
export const SHELTERS = [
  feature('1', '横浜テスト小学校', '神奈川県横浜市中区1-1', [139.638, 35.444], {
    洪水: '1',
    地震: '1',
  }),
  feature('2', '川崎テスト公園', '神奈川県川崎市川崎区2-2', [139.703, 35.531], {
    地震: '1',
    津波: '1',
  }),
  feature('3', '相模原テスト体育館', '神奈川県相模原市緑区3-3', [139.341, 35.596], {
    '崖崩れ、土石流及び地滑り': '1',
    地震: '1',
  }),
  // Check that the popup shows this as text, not as HTML
  feature('4', '<b>港</b>&テスト広場', '東京都港区4-4', [139.751, 35.658], {
    大規模な火事: '1',
  }),
] as const;

/** Has no address, so it is dropped on load. */
const INVALID_FEATURE = {
  ...SHELTERS[0],
  properties: { ...SHELTERS[0].properties, 共通ID: '99', 住所: undefined },
};

// A 1x1 transparent PNG
const EMPTY_TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

export const test = base.extend<Options>({
  dataset: ['fixture', { option: true }],

  page: async ({ page, dataset }, use) => {
    // Never fetch from the external tile servers (OpenStreetMap / GSI)
    await page.route(/tile\.openstreetmap\.org|cyberjapandata\.gsi\.go\.jp/, (route) =>
      route.fulfill({ contentType: 'image/png', body: EMPTY_TILE }),
    );
    if (dataset === 'fixture') {
      await page.route('**/assets/mergeFromCity_2.geojson.gz', (route) =>
        route.fulfill({
          contentType: 'application/gzip',
          body: gzipSync(
            JSON.stringify({ type: 'FeatureCollection', features: [...SHELTERS, INVALID_FEATURE] }),
          ),
        }),
      );
    }
    await use(page);
  },
});

export { expect };

/** Open the top page and wait until the shelter data has loaded. */
export async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '指定緊急避難場所マップ' })).toBeVisible();
  await expect(page.getByRole('status', { name: '避難場所データを読み込み中' })).toBeHidden({
    timeout: 30_000,
  });
}

/** The count shown at the top right of the table. */
export function resultCount(page: Page) {
  return page.getByText(/^[\d,]+ 件$/);
}

/** Data rows of the table (those rendered by virtual scrolling). */
export function tableRows(page: Page) {
  return page.getByRole('rowgroup').getByRole('row');
}

/** Pins on the map. */
export function mapMarkers(page: Page) {
  return page.locator('.leaflet-marker-pane .leaflet-marker-icon');
}

/** The keyword box of the filter bar (matches the name or the address). */
export function searchBox(page: Page) {
  return page.getByRole('searchbox', { name: '名前・住所で検索' });
}

/** A disaster type chip of the filter bar. */
export function typeChip(page: Page, label: string) {
  return page.getByRole('button', { name: label, exact: true });
}

/** The current zoom level of the map, read from the URL ({z}/{x}/{y}) of the front tile layer. */
export function currentZoom(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const levels = [...document.querySelectorAll<HTMLElement>('.leaflet-tile-container')];
    const front = levels.sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex))[0];
    const src = front?.querySelector('img')?.getAttribute('src');
    const z = src?.match(/\/(\d+)\/\d+\/\d+\.\w+$/)?.[1];
    return z === undefined ? null : Number(z);
  });
}
