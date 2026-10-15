import {
  addTodo,
  answerConfirmation,
  chooseFromHeaderMenu,
  expect,
  openApp,
  test,
  todoItems,
} from '../fixtures';

test.use({ sampleData: true });

test('shows sample todos and folders on the first visit only', async ({ page }) => {
  await openApp(page);
  const welcome = todoItems(page).filter({ hasText: 'TODO へようこそ' });
  await expect(welcome).toHaveCount(1);
  await expect(welcome).toContainText('データはこのブラウザにだけ保存されます。');
  await expect(
    page.getByRole('navigation', { name: 'フォルダ' }).getByText('資料作成', { exact: true }),
  ).toBeVisible();
  const count = await todoItems(page).count();
  expect(count).toBeGreaterThan(1);

  // Reopening does not add more
  await page.reload();
  await expect(page.getByText('読み込み中…')).toBeHidden();
  await expect(todoItems(page)).toHaveCount(count);

  // Even after deleting all data from the menu, samples are not added again
  await chooseFromHeaderMenu(page, 'すべてのデータを削除…');
  await answerConfirmation(page, 'すべてのデータを削除しますか？', 'すべて削除');
  await expect(page.getByRole('status')).toHaveText(/すべてのデータを削除しました。/);
  await expect(todoItems(page)).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('読み込み中…')).toBeHidden();
  await expect(todoItems(page)).toHaveCount(0);
});

test('resets the app to the first visit, including settings and other tabs', async ({ page }) => {
  await openApp(page);
  const other = await page.context().newPage();
  await openApp(other);

  // Change the data and the settings
  await addTodo(page, '自分の TODO');
  await chooseFromHeaderMenu(page, 'テーマ…');
  await page.getByRole('dialog', { name: 'テーマ', exact: true }).getByText('オーシャン').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ocean');
  await page.locator('header').getByRole('button', { name: 'メニュー', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'English' }).click();

  await page.locator('header').getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Reset app…' }).click();
  await answerConfirmation(page, 'Reset the app?', 'Reset');

  // The page reloads with the samples, the browser language, and the default theme
  for (const tab of [page, other]) {
    await expect(todoItems(tab).filter({ hasText: 'TODO へようこそ' })).toHaveCount(1);
    await expect(todoItems(tab).filter({ hasText: '自分の TODO' })).toHaveCount(0);
    await expect(
      tab.locator('header').getByRole('button', { name: 'メニュー', exact: true }),
    ).toBeVisible();
  }
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'indigo');
  await other.close();
});

test('writes the samples in English for English browsers', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();
  await page.goto('/');
  // The names in the list are also in English, so search by the title text
  await expect(page.getByText('Welcome to TODO', { exact: true })).toBeVisible();
  await context.close();
});
