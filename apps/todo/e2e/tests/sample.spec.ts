import {
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

test('writes the samples in English for English browsers', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();
  await page.goto('/');
  // The names in the list are also in English, so search by the title text
  await expect(page.getByText('Welcome to TODO', { exact: true })).toBeVisible();
  await context.close();
});
