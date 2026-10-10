import { addTodo, expect, openApp, test, todoItems } from '../fixtures';

test('selects light and dark modes independently of the OS and follows it in automatic mode', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await openApp(page);
  const root = page.locator('html');
  const button = page.getByRole('button', { name: 'テーマ', exact: true });
  const dialog = page.getByRole('dialog', { name: '配色テーマ' });
  await button.click();
  await expect(dialog.getByRole('radio', { name: '自動', exact: true })).toBeChecked();
  await dialog.getByText('フォレスト', { exact: true }).click();
  await dialog.getByText('ダーク', { exact: true }).click();
  await expect(root).toHaveAttribute('data-mode', 'dark');
  await expect(root).toHaveCSS('color-scheme', 'dark');
  const dark = await page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.reload();
  await expect(root).toHaveAttribute('data-mode', 'dark');
  await expect(root).toHaveAttribute('data-theme', 'forest');
  await expect(page.locator('body')).toHaveCSS('background-color', dark);
  await button.click();
  await expect(dialog.getByRole('radio', { name: 'ダーク', exact: true })).toBeChecked();
  await dialog.getByText('ライト', { exact: true }).click();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(root).toHaveAttribute('data-mode', 'light');
  await expect(root).toHaveCSS('color-scheme', 'light');
  await expect(page.locator('body')).not.toHaveCSS('background-color', dark);
  await dialog.getByText('自動', { exact: true }).click();
  await expect(root).toHaveAttribute('data-mode', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(root).toHaveAttribute('data-mode', 'light');
  await expect(root).toHaveAttribute('data-theme', 'forest');
});

test('keeps content neutral with readable sidebar palettes, restores it, and supports dark mode and mobile', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await openApp(page);
  await addTodo(page, '配色を確認');
  const button = page.locator('header').getByRole('button', { name: 'テーマ', exact: true });
  const dialog = page.getByRole('dialog', { name: '配色テーマ' });
  const bodyColor = () =>
    page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor);
  const initialBackground = await bodyColor();
  const card = todoItems(page).first();
  const initialBorder = await card.evaluate((el) => getComputedStyle(el).borderColor);
  const initialText = await card.evaluate((el) => getComputedStyle(el).color);
  const sidebar = page.locator('#folder-panel');
  const sidebarColor = () => sidebar.evaluate((el) => getComputedStyle(el).backgroundColor);
  const backgrounds = new Set<string>([await sidebarColor()]);

  await button.click();
  await expect(dialog.getByRole('radio', { name: 'スタンダード' })).toBeChecked();
  for (const name of ['フォレスト', 'サクラ', 'サンド', 'ラベンダー']) {
    await dialog.getByText(name, { exact: true }).click();
    await expect(dialog.getByRole('radio', { name })).toBeChecked();
    expect(await bodyColor()).toBe(initialBackground);
    backgrounds.add(await sidebarColor());
    expect(
      await page.locator('header').evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toBe(await sidebarColor());
    await expect
      .poll(() =>
        page.evaluate(() => {
          const primary = document.querySelector('main button[type="submit"]');
          const selected = document.querySelector('#folder-panel [aria-pressed="true"]');
          if (!primary || !selected) throw new Error('theme controls unavailable');
          return (
            getComputedStyle(primary).backgroundColor === getComputedStyle(selected).backgroundColor
          );
        }),
      )
      .toBe(true);
    expect(await card.evaluate((el) => getComputedStyle(el).borderColor)).toBe(initialBorder);
    expect(await card.evaluate((el) => getComputedStyle(el).color)).toBe(initialText);
    await expect(sidebar).toHaveCSS('color', 'rgb(248, 250, 252)');
    const contrast = () =>
      sidebar.evaluate((el) => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas unavailable');
        const luminance = (color: string) => {
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1, 1);
          const rgb = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map((channel) => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          });
          return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
        };
        const ratio = (foreground: string, background: string) => {
          const a = luminance(foreground);
          const b = luminance(background);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        };
        const selected = el.querySelector('[aria-pressed="true"]');
        if (!selected) throw new Error('selected status unavailable');
        const style = getComputedStyle(el);
        const selectedStyle = getComputedStyle(selected);
        return [
          ratio(style.color, style.backgroundColor),
          ratio(selectedStyle.color, selectedStyle.backgroundColor),
        ];
      });
    await expect.poll(async () => Math.min(...(await contrast()))).toBeGreaterThanOrEqual(4.5);
  }
  expect(backgrounds.size).toBe(5);
  await dialog.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath('light-theme.png') });
  const lavenderBackground = await bodyColor();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'lavender');
  expect(await bodyColor()).toBe(lavenderBackground);
  await expect(todoItems(page)).toHaveText([/配色を確認/]);

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(bodyColor).not.toBe(lavenderBackground);
  await page.screenshot({ path: testInfo.outputPath('dark-theme.png') });
  await page.setViewportSize({ width: 320, height: 800 });
  await button.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('radio', { name: 'ラベンダー' }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(dialog.getByRole('radio', { name: 'サンド' })).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});
