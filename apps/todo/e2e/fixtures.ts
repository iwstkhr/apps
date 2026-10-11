import { test as base, expect, type Page } from '@playwright/test';

export { expect };

/**
 * アプリは IndexedDB を初めて作るときにサンプルを入れる。既存のテストは空の状態を前提に
 * しているので、アプリより先に空のデータベースを作っておく。サンプルを確かめるテストでは
 * `test.use({ sampleData: true })` にする。
 */
export const test = base.extend<{ sampleData: boolean }>({
  sampleData: [false, { option: true }],
  page: async ({ page, sampleData }, use) => {
    if (!sampleData) {
      await page.addInitScript(() => {
        // バージョンを付けずに開くと store の無いバージョン 1 ができ、アプリは store だけを作る
        const request = indexedDB.open('todo');
        request.onsuccess = () => request.result.close();
      });
    }
    await use(page);
  },
});

/** トップページを開き、IndexedDB の読み込みが終わるまで待つ。 */
export async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'TODO' })).toBeVisible();
  await expect(page.getByText('読み込み中…')).toBeHidden();
}

/** タイトルだけで TODO を追加する。 */
export async function addTodo(page: Page, title: string): Promise<void> {
  await page.getByRole('textbox', { name: 'タイトル' }).fill(title);
  await page.getByRole('button', { name: '追加', exact: true }).click();
  await expect(todoItems(page).filter({ hasText: title })).toHaveCount(1);
}

/** ヘッダーの「メニュー」を開いて項目を選ぶ。 */
export async function chooseFromHeaderMenu(page: Page, item: string): Promise<void> {
  await page.locator('header').getByRole('button', { name: 'メニュー', exact: true }).click();
  await page.getByRole('menu').getByRole('menuitem', { name: item, exact: true }).click();
}

/** アプリ内の確認ダイアログでボタンを押し、閉じるまで待つ。 */
export async function answerConfirmation(page: Page, title: string, button: string): Promise<void> {
  const dialog = page.getByRole('dialog', { name: title });
  await dialog.getByRole('button', { name: button, exact: true }).click();
  await expect(dialog).toBeHidden();
}

export function todoItems(page: Page) {
  return page.getByRole('list', { name: 'TODO 一覧' }).locator(':scope > li');
}
