import { expect, openApp, test } from '../fixtures';

test('labels the header menu button メニュー and shows the text only on wide screens', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page);
  const header = page.locator('header');
  const menuButton = header.getByRole('button', { name: 'メニュー', exact: true });
  await expect(menuButton).toBeVisible();
  const label = menuButton.getByText('メニュー', { exact: true });
  // Text kept for screen readers is shrunk to 1px and hidden (sr-only), so visibility is checked by size
  const labelWidth = async () => (await label.boundingBox())?.width ?? 0;
  expect(await labelWidth()).toBeGreaterThan(20);
  // Wide screens have no ☰ on the left, so there is only one 「メニュー」
  await expect(header.getByRole('button', { name: 'フォルダを開く' })).toBeHidden();

  await page.setViewportSize({ width: 375, height: 800 });
  // Narrow screens show only ⋯, and the accessible name stays 「メニュー」
  await expect(menuButton).toBeVisible();
  await expect.poll(labelWidth).toBeLessThanOrEqual(1);
  const navButton = header.getByRole('button', { name: 'フォルダを開く' });
  await expect(navButton).toBeVisible();

  await navButton.click();
  await expect(page.getByRole('dialog', { name: 'フォルダ', exact: true })).toBeVisible();
});

test('keeps both header buttons readable on dark headers', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 375, height: 800 });
  await openApp(page);
  await page.evaluate(() => localStorage.setItem('todo:theme', 'mint'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mint');
  const header = page.locator('header');
  for (const name of ['フォルダを開く', 'メニュー']) {
    await expect(header.getByRole('button', { name, exact: true })).toHaveCSS(
      'color',
      'rgb(248, 250, 252)',
    );
  }
});

test('describes local-only storage next to the title on wide screens', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page);
  const tagline = page.locator('header').getByText('ブラウザで完結');
  await expect(tagline).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('TODO');

  // The color leans toward white so it stays readable on dark headers
  await page.evaluate(() => localStorage.setItem('todo:theme', 'mint'));
  await page.reload();
  await expect(tagline).toHaveCSS('color', 'rgba(255, 255, 255, 0.7)');

  // Hidden on narrow screens to make room for ☰ and the menu
  await page.setViewportSize({ width: 375, height: 800 });
  await expect(tagline).toBeHidden();
});
