import { addTodo, chooseFromHeaderMenu, expect, openApp, test, todoItems } from '../fixtures';

test('selects light and dark modes independently of the OS and follows it in automatic mode', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await openApp(page);
  const root = page.locator('html');
  const dialog = page.getByRole('dialog', { name: 'テーマ', exact: true });
  const openTheme = () => chooseFromHeaderMenu(page, 'テーマ…');
  await openTheme();
  await expect(dialog.getByRole('radio', { name: '自動', exact: true })).toBeChecked();
  await dialog.getByText('オーシャン', { exact: true }).click();
  await dialog.getByText('ダーク', { exact: true }).click();
  await expect(root).toHaveAttribute('data-mode', 'dark');
  await expect(root).toHaveCSS('color-scheme', 'dark');
  const dark = await page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.reload();
  await expect(root).toHaveAttribute('data-mode', 'dark');
  await expect(root).toHaveAttribute('data-theme', 'ocean');
  await expect(page.locator('body')).toHaveCSS('background-color', dark);
  await openTheme();
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
  await expect(root).toHaveAttribute('data-theme', 'ocean');
});

test('keeps content neutral with readable sidebar palettes, restores it, and supports dark mode and mobile', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await openApp(page);
  await addTodo(page, '配色を確認');
  const button = page.locator('header').getByRole('button', { name: 'メニュー', exact: true });
  const dialog = page.getByRole('dialog', { name: 'テーマ', exact: true });
  const openTheme = () => chooseFromHeaderMenu(page, 'テーマ…');
  const bodyColor = () =>
    page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor);
  const initialBackground = await bodyColor();
  const card = todoItems(page).first();
  const initialBorder = await card.evaluate((el) => getComputedStyle(el).borderColor);
  const initialText = await card.evaluate((el) => getComputedStyle(el).color);
  const sidebar = page.locator('#folder-panel');
  const sidebarColor = () => sidebar.evaluate((el) => getComputedStyle(el).backgroundColor);
  const backgrounds = new Set<string>([await sidebarColor()]);

  // 既定のインディゴは白いサイドバーのまま、主ボタンをインディゴ (#4f46e5) にする
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'indigo');
  // 追加した直後はポインタが追加ボタンの上にあり、ホバーの色になるので外す
  await page.mouse.move(0, 0);
  await expect(page.locator('main button[type="submit"]')).toHaveCSS(
    'background-color',
    'rgb(79, 70, 229)',
  );
  await expect(sidebar).not.toHaveCSS('background-color', 'rgb(31, 35, 40)');

  await openTheme();
  await expect(dialog.getByRole('radio', { name: 'インディゴ' })).toBeChecked();
  for (const name of ['オーベルジーヌ', 'オーシャン', 'ミント', 'サンセット', 'グラファイト']) {
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
  expect(backgrounds.size).toBe(6);
  await dialog.getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath('light-theme.png') });
  const graphiteBackground = await bodyColor();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'graphite');
  expect(await bodyColor()).toBe(graphiteBackground);
  await expect(todoItems(page)).toHaveText([/配色を確認/]);

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(bodyColor).not.toBe(graphiteBackground);
  await page.screenshot({ path: testInfo.outputPath('dark-theme.png') });
  await page.setViewportSize({ width: 320, height: 800 });
  await openTheme();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('radio', { name: 'グラファイト' }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(dialog.getByRole('radio', { name: 'サンセット' })).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test('keeps the status icon colors on dark sidebars', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await openApp(page);
  const icon = (status: string) => page.locator(`#folder-panel svg[data-status="${status}"]`);
  const expected = {
    todo: 'rgb(122, 136, 156)',
    in_progress: 'rgb(59, 130, 246)',
    on_hold: 'rgb(168, 85, 247)',
    done: 'rgb(5, 150, 105)',
  };
  for (const theme of ['インディゴ', 'オーシャン', 'グラファイト']) {
    await chooseFromHeaderMenu(page, 'テーマ…');
    const dialog = page.getByRole('dialog', { name: 'テーマ', exact: true });
    await dialog.getByText(theme, { exact: true }).click();
    await dialog.getByRole('button', { name: '閉じる', exact: true }).click();
    for (const [status, color] of Object.entries(expected)) {
      await expect(icon(status)).toHaveCSS('color', color);
    }
  }
});
