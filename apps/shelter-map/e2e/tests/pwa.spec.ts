import { expect, openApp, resultCount, tableRows, test } from '../fixtures';

test.describe('PWA', () => {
  // Precache the real GeoJSON from the build (requests from the service worker skip page.route)
  test.use({ dataset: 'real', serviceWorkers: 'allow' });

  test.beforeEach(async ({ context }) => {
    // Also stub tiles requested through the service worker
    await context.route(/tile\.openstreetmap\.org|cyberjapandata\.gsi\.go\.jp/, (route) =>
      route.fulfill({ status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }),
    );
  });

  test('ホーム画面に追加できるマニフェストを提供する', async ({ page }) => {
    await openApp(page);

    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();
    const response = await page.request.get(new URL(href ?? '', page.url()).href);
    expect(response.ok()).toBe(true);
    const manifest = await response.json();
    expect(manifest).toMatchObject({
      name: '指定緊急避難場所マップ',
      start_url: './',
      display: 'standalone',
    });
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: '192x192' }),
        expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
      ]),
    );
  });

  test('一度開いたあとはオフラインでも避難場所を表示できる', async ({ page, context }) => {
    await openApp(page);
    // Wait until the service worker has precached everything and controls the page
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) =>
          navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }),
        );
      }
    });

    await context.setOffline(true);
    await page.reload();
    await openApp(page);

    const count = Number((await resultCount(page).textContent())?.replace(/[^\d]/g, ''));
    expect(count).toBeGreaterThan(10_000);
    await expect(tableRows(page).first()).toBeVisible();
  });
});
