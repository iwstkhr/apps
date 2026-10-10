import { expect, type Page, test } from '@playwright/test';

export { expect, test };

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

export function todoItems(page: Page) {
  return page.getByRole('list', { name: 'TODO 一覧' }).locator(':scope > li');
}
