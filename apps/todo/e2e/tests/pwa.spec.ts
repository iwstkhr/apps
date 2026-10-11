import { addTodo, expect, openApp, test, todoItems } from '../fixtures';

test.describe('PWA', () => {
  test('links a manifest with installable icons', async ({ page, request }) => {
    await page.goto('/');

    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();
    const manifest = await (await request.get(href as string)).json();
    expect(manifest).toMatchObject({ name: 'TODO', display: 'standalone', start_url: './' });
    for (const icon of manifest.icons) {
      const response = await request.get(
        new URL(icon.src, new URL(href as string, page.url())).href,
      );
      expect(response.ok(), icon.src).toBe(true);
      expect(response.headers()['content-type']).toContain('image/png');
    }
  });

  test('opens with saved todos while offline', async ({ page, context }) => {
    await openApp(page);
    await addTodo(page, 'オフラインでも見える');
    // 先読みが終わって、このページを Service Worker が受け持つまで待つ
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

    await expect(page.getByRole('heading', { name: 'TODO' })).toBeVisible();
    await expect(todoItems(page).filter({ hasText: 'オフラインでも見える' })).toHaveCount(1);
  });
});
