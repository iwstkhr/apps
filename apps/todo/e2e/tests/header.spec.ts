import { expect, openApp, test } from '../fixtures';

test('keeps both header buttons readable on dark headers', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 375, height: 800 });
  await openApp(page);
  await page.evaluate(() => localStorage.setItem('todo:theme', 'mint'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mint');
  const header = page.locator('header');
  for (const name of ['メニューを開く', 'その他の操作']) {
    await expect(header.getByRole('button', { name, exact: true })).toHaveCSS(
      'color',
      'rgb(248, 250, 252)',
    );
  }
});
