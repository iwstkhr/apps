import type { Page } from '@playwright/test';
import { expect, openApp, test } from '../fixtures';

function languageItem(page: Page, name: string) {
  return page.getByRole('menu').getByRole('menuitemradio', { name });
}

test.describe('in a Japanese browser', () => {
  test.use({ locale: 'ja-JP' });

  test('starts in Japanese, switches to English, and keeps the choice', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
    await expect(page.getByRole('button', { name: '追加', exact: true })).toBeVisible();

    await page.locator('header').getByRole('button', { name: 'メニュー', exact: true }).click();
    await languageItem(page, 'English').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /runs entirely in your browser/,
    );

    // 入力した内容は訳さない
    await page.getByRole('textbox', { name: 'Title' }).fill('牛乳を買う');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Todo list' }).getByRole('listitem')).toHaveText([
      /牛乳を買う/,
    ]);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'TODO' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Folders' })).toBeVisible();
    await page.locator('header').getByRole('button', { name: 'Menu', exact: true }).click();
    await expect(languageItem(page, 'English')).toHaveAttribute('aria-checked', 'true');
  });
});

test.describe('in an English browser', () => {
  test.use({ locale: 'en-US' });

  test('starts in English', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'TODO' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();
    await page.locator('header').getByRole('button', { name: 'Menu', exact: true }).click();
    await expect(languageItem(page, 'English')).toHaveAttribute('aria-checked', 'true');
  });

  test('fits the header on a narrow screen and switches the language from the menu', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'TODO' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);

    await page.locator('header').getByRole('button', { name: 'Menu', exact: true }).click();
    // メニューも画面の幅に収まる
    const menu = await page.getByRole('menu').boundingBox();
    expect(menu?.x).toBeGreaterThanOrEqual(0);
    expect((menu?.x ?? 0) + (menu?.width ?? 0)).toBeLessThanOrEqual(320);
    await languageItem(page, '日本語').click();
    await expect(page.getByRole('button', { name: '追加', exact: true })).toBeVisible();
    // 英語に戻すメニュー操作はキーボードでもできる
    await page.locator('header').getByRole('button', { name: 'メニュー', exact: true }).focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();
  });
});
