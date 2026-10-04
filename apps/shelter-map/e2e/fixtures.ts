import { gzipSync } from 'node:zlib';
import { test as base, expect, type Page } from '@playwright/test';
import type { ShelterGeoJsonFeature, ShelterGeoJsonProperties } from '../app/types/shelter';

export type Options = {
  /** fixture: 下の SHELTERS だけを配信する / real: リポジトリにある本物のデータを使う */
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

function feature(
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

/** すべて初期表示 (関東周辺、ズーム 8) の範囲に収まる位置に置く。 */
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
  // ポップアップで HTML としてではなく文字として表示されることを確かめる
  feature('4', '<b>港</b>&テスト広場', '東京都港区4-4', [139.751, 35.658], {
    大規模な火事: '1',
  }),
] as const;

/** 住所が無いので読み込み時に捨てられる。 */
const INVALID_FEATURE = {
  ...SHELTERS[0],
  properties: { ...SHELTERS[0].properties, 共通ID: '99', 住所: undefined },
};

// 1x1 の透明な PNG
const EMPTY_TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

export const test = base.extend<Options>({
  dataset: ['fixture', { option: true }],

  page: async ({ page, dataset }, use) => {
    // 外部のタイルサーバ (OpenStreetMap / 国土地理院) には取りに行かない
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

/** トップページを開き、避難場所データの読み込みが終わるまで待つ。 */
export async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '指定緊急避難場所マップ' })).toBeVisible();
  await expect(page.getByRole('status', { name: '避難場所データを読み込み中' })).toBeHidden({
    timeout: 30_000,
  });
}

/** 表の右上に出る件数。 */
export function resultCount(page: Page) {
  return page.getByText(/^[\d,]+ 件$/);
}

/** 表のデータ行 (仮想スクロールで描画されている分)。 */
export function tableRows(page: Page) {
  return page.getByRole('rowgroup').getByRole('row');
}

/** 地図上のピン。 */
export function mapMarkers(page: Page) {
  return page.locator('.leaflet-marker-pane .leaflet-marker-icon');
}

/** 列見出しのフィルターを開く。 */
export async function openColumnFilter(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: `${label}のフィルター` }).click();
}

/** 地図の今のズームレベル。前面にあるタイル層の URL ({z}/{x}/{y}) から読む。 */
export function currentZoom(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const levels = [...document.querySelectorAll<HTMLElement>('.leaflet-tile-container')];
    const front = levels.sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex))[0];
    const src = front?.querySelector('img')?.getAttribute('src');
    const z = src?.match(/\/(\d+)\/\d+\/\d+\.\w+$/)?.[1];
    return z === undefined ? null : Number(z);
  });
}
