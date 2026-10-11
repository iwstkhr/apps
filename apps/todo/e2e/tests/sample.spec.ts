import { expect, openApp, test, todoItems } from '../fixtures';

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

  // 開き直しても増えない
  await page.reload();
  await expect(page.getByText('読み込み中…')).toBeHidden();
  await expect(todoItems(page)).toHaveCount(count);

  // 全部ゴミ箱に入れて完全に消しても、もう入らない
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const request = indexedDB.open('todo');
        request.onsuccess = () => {
          const tx = request.result.transaction(['todos', 'folders'], 'readwrite');
          tx.objectStore('todos').clear();
          tx.objectStore('folders').clear();
          tx.oncomplete = () => {
            request.result.close();
            resolve();
          };
        };
      }),
  );
  await page.reload();
  await expect(page.getByText('読み込み中…')).toBeHidden();
  await expect(todoItems(page)).toHaveCount(0);
});

test('writes the samples in English for English browsers', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();
  await page.goto('/');
  // 一覧の名前も英語になるので、タイトルの文字で探す
  await expect(page.getByText('Welcome to TODO', { exact: true })).toBeVisible();
  await context.close();
});
