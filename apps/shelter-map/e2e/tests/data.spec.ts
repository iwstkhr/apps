import { expect, openApp, resultCount, tableRows, test } from '../fixtures';

test.describe('データの読み込み', () => {
  test.describe('本物のデータ', () => {
    test.use({ dataset: 'real' });

    test('リポジトリの GeoJSON (gzip) を読み込み、表に並べる', async ({ page }) => {
      await openApp(page);

      await expect(page.getByText('国土地理院 指定緊急避難場所データ')).toBeVisible();
      const count = Number((await resultCount(page).textContent())?.replace(/[^\d]/g, ''));
      expect(count).toBeGreaterThan(10_000);
      await expect(tableRows(page).first()).toBeVisible();
    });
  });

  test('不正な Feature は読み飛ばし、正しいものだけを表示する', async ({ page }) => {
    await openApp(page);

    await expect(resultCount(page)).toHaveText('4 件');
    await expect(tableRows(page)).toHaveCount(4);
  });

  test('データの取得に失敗すると、地図の上にエラーを表示する', async ({ page }) => {
    await page.route('**/assets/mergeFromCity_2.geojson.gz', (route) =>
      route.fulfill({ status: 500 }),
    );
    await openApp(page);

    await expect(page.getByText('Failed to fetch resource: 500')).toBeVisible();
    await expect(resultCount(page)).toHaveText('0 件');
  });

  test('未知のパスを開くと、SPA が 404 を表示する', async ({ page }) => {
    const response = await page.goto('/no-such-page');

    // wrangler.jsonc の not_found_handling により index.html が 200 で返る
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByText('お探しのページは見つかりませんでした。')).toBeVisible();
  });
});
