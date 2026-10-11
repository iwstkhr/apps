import { test as base, expect, type Page } from '@playwright/test';

export { expect };

/**
 * The app adds samples when it first creates IndexedDB. Existing tests assume an empty state,
 * so create an empty database before the app does. Tests that check the samples
 * use `test.use({ sampleData: true })`.
 */
export const test = base.extend<{ sampleData: boolean }>({
  sampleData: [false, { option: true }],
  page: async ({ page, sampleData }, use) => {
    if (!sampleData) {
      await page.addInitScript(() => {
        // Opening without a version creates version 1 with no stores, and the app creates only the stores
        const request = indexedDB.open('todo');
        request.onsuccess = () => request.result.close();
      });
    }
    await use(page);
  },
});

/** Open the top page and wait until IndexedDB has loaded. */
export async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'TODO' })).toBeVisible();
  await expect(page.getByText('読み込み中…')).toBeHidden();
}

/** Add a todo with only a title. */
export async function addTodo(page: Page, title: string): Promise<void> {
  await page.getByRole('textbox', { name: 'タイトル' }).fill(title);
  await page.getByRole('button', { name: '追加', exact: true }).click();
  await expect(todoItems(page).filter({ hasText: title })).toHaveCount(1);
}

/** Open the header's 「メニュー」 and choose an item. */
export async function chooseFromHeaderMenu(page: Page, item: string): Promise<void> {
  await page.locator('header').getByRole('button', { name: 'メニュー', exact: true }).click();
  await page.getByRole('menu').getByRole('menuitem', { name: item, exact: true }).click();
}

/** Press a button in the in-app confirmation dialog and wait until it closes. */
export async function answerConfirmation(page: Page, title: string, button: string): Promise<void> {
  const dialog = page.getByRole('dialog', { name: title });
  await dialog.getByRole('button', { name: button, exact: true }).click();
  await expect(dialog).toBeHidden();
}

export function todoItems(page: Page) {
  return page.getByRole('list', { name: 'TODO 一覧' }).locator(':scope > li');
}
