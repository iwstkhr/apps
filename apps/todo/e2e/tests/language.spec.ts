import { expect, openApp, test } from '../fixtures';

test.describe('in a Japanese browser', () => {
  test.use({ locale: 'ja-JP' });

  test('starts in Japanese, switches to English, and keeps the choice', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
    await expect(page.getByRole('button', { name: '追加', exact: true })).toBeVisible();

    await page.getByRole('combobox', { name: '言語' }).selectOption('en');
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
    await expect(page.getByRole('combobox', { name: 'Language' })).toHaveValue('en');
    await expect(page.getByRole('navigation', { name: 'Folders' })).toBeVisible();
  });
});

test.describe('in an English browser', () => {
  test.use({ locale: 'en-US' });

  test('starts in English', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'TODO' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Language' })).toHaveValue('en');
  });

  test('fits the header on a narrow screen and opens the language list from the icon', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'TODO' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);

    const select = page.getByRole('combobox', { name: 'Language' });
    await select.selectOption('ja');
    await expect(page.getByRole('button', { name: '追加', exact: true })).toBeVisible();
  });
});
