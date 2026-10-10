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
  // 読み上げ用に残す文字は 1px に縮めて隠す (sr-only) ので、見えているかは大きさで確かめる
  const labelWidth = async () => (await label.boundingBox())?.width ?? 0;
  expect(await labelWidth()).toBeGreaterThan(20);
  // 広い画面では左の ☰ は出ないので、「メニュー」はひとつだけ
  await expect(header.getByRole('button', { name: 'フォルダとステータスを開く' })).toBeHidden();

  await page.setViewportSize({ width: 375, height: 800 });
  // 狭い画面では ⋯ だけにし、読み上げの名前は「メニュー」のまま
  await expect(menuButton).toBeVisible();
  await expect.poll(labelWidth).toBeLessThanOrEqual(1);
  const navButton = header.getByRole('button', { name: 'フォルダとステータスを開く' });
  await expect(navButton).toBeVisible();

  await navButton.click();
  await expect(
    page.getByRole('dialog', { name: 'フォルダとステータス', exact: true }),
  ).toBeVisible();
});

test('keeps both header buttons readable on dark headers', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 375, height: 800 });
  await openApp(page);
  await page.evaluate(() => localStorage.setItem('todo:theme', 'mint'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mint');
  const header = page.locator('header');
  for (const name of ['フォルダとステータスを開く', 'メニュー']) {
    await expect(header.getByRole('button', { name, exact: true })).toHaveCSS(
      'color',
      'rgb(248, 250, 252)',
    );
  }
});
