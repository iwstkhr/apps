import type { Page } from '@playwright/test';
import { addTodo, answerConfirmation, expect, openApp, test, todoItems } from '../fixtures';

function trashRow(page: Page) {
  return page
    .getByRole('navigation', { name: 'フォルダ' })
    .getByRole('button', { name: /^ゴミ箱(\s*\d+)?$/ });
}

function trashItems(page: Page) {
  return page.getByRole('list', { name: 'ゴミ箱の TODO' }).getByRole('listitem');
}

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('moves a deleted todo to the trash, keeps it after reloading, and restores it', async ({
  page,
}) => {
  let dialogs = 0;
  page.on('dialog', (dialog) => {
    dialogs++;
    void dialog.accept();
  });
  await addTodo(page, '洗濯');
  await addTodo(page, '掃除');

  await page.getByRole('button', { name: '「洗濯」をゴミ箱に移動' }).click();
  await expect(page.getByRole('status')).toHaveText(/「洗濯」をゴミ箱に移動しました。/);
  expect(dialogs).toBe(0);
  await expect(todoItems(page)).toHaveText([/掃除/]);

  await page.reload();
  await expect(trashRow(page)).toHaveText(/ゴミ箱\s*1/);
  await trashRow(page).click();
  await expect(trashItems(page)).toHaveText([/洗濯.*あと 30 日で自動で削除/]);

  await page.getByRole('button', { name: '「洗濯」を元に戻す' }).click();
  await expect(page.getByText('ゴミ箱は空です。')).toBeVisible();
  await page
    .getByRole('navigation', { name: 'フォルダ' })
    .getByRole('button', { name: /^すべて/ })
    .click();
  await expect(todoItems(page)).toHaveCount(2);
});

test('undoes moving to the trash from the notice', async ({ page }) => {
  await addTodo(page, '洗濯');
  await page.getByRole('button', { name: '「洗濯」をゴミ箱に移動' }).click();
  await page.getByRole('status').getByRole('button', { name: '元に戻す' }).click();
  await expect(page.getByRole('status')).toHaveText(/「洗濯」を元に戻しました。/);
  await expect(todoItems(page)).toHaveText([/洗濯/]);
});

test('drops a todo on the trash and deletes it forever after confirming', async ({ page }) => {
  await addTodo(page, '洗濯');

  await todoItems(page)
    .filter({ hasText: '洗濯' })
    .getByRole('region', { name: '「洗濯」のヘッダー' })
    .dragTo(trashRow(page));
  await expect(page.getByRole('status')).toHaveText(/「洗濯」をゴミ箱に移動しました。/);

  await trashRow(page).click();
  const deleteForever = page.getByRole('button', { name: '「洗濯」を完全に削除' });
  await deleteForever.click();
  // To prevent accidental confirmation, focus starts on cancel, and Escape cancels
  const dialog = page.getByRole('dialog', { name: '「洗濯」を完全に削除しますか？' });
  await expect(dialog).toContainText('この操作は元に戻せません。');
  await expect(dialog.getByRole('button', { name: 'キャンセル' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trashItems(page)).toHaveCount(1);
  // Closing returns focus to the pressed button
  await expect(deleteForever).toBeFocused();
  // Clicking the backdrop also cancels
  await deleteForever.click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dialog).toBeHidden();
  await expect(trashItems(page)).toHaveCount(1);

  await deleteForever.click();
  await answerConfirmation(page, '「洗濯」を完全に削除しますか？', '完全に削除');
  await expect(page.getByText('ゴミ箱は空です。')).toBeVisible();
  await page.reload();
  await trashRow(page).click();
  await expect(page.getByText('ゴミ箱は空です。')).toBeVisible();
});

test('empties the trash after confirming in the app dialog', async ({ page }) => {
  let dialogs = 0;
  page.on('dialog', (dialog) => {
    dialogs++;
    void dialog.dismiss();
  });
  await addTodo(page, '洗濯');
  await addTodo(page, '掃除');
  await page.getByRole('button', { name: '「洗濯」をゴミ箱に移動' }).click();
  await page.getByRole('button', { name: '「掃除」をゴミ箱に移動' }).click();

  await trashRow(page).click();
  await page.getByRole('main').getByRole('button', { name: 'ゴミ箱を空にする' }).click();
  await answerConfirmation(page, 'ゴミ箱の 2 件を完全に削除しますか？', '空にする');
  await expect(page.getByText('ゴミ箱は空です。')).toBeVisible();
  // The browser's native confirmation dialog is not shown
  expect(dialogs).toBe(0);
});

test('empties the trash from the sidebar without opening it', async ({ page }) => {
  await addTodo(page, '洗濯');
  await addTodo(page, '掃除');
  await page.getByRole('button', { name: '「洗濯」をゴミ箱に移動' }).click();

  const nav = page.getByRole('navigation', { name: 'フォルダ' });
  await trashRow(page).hover();
  await nav.getByRole('button', { name: 'ゴミ箱を空にする' }).click();
  await answerConfirmation(page, 'ゴミ箱の 1 件を完全に削除しますか？', '空にする');
  await expect(trashRow(page)).toHaveText(/^ゴミ箱$/);
  await expect(nav.getByRole('button', { name: 'ゴミ箱を空にする' })).toHaveCount(0);
  await expect(todoItems(page)).toHaveText([/掃除/]);
});
