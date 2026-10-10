import type { Page } from '@playwright/test';
import { addTodo, expect, openApp, test, todoItems } from '../fixtures';

function trashRow(page: Page) {
  return page
    .getByRole('navigation', { name: 'フォルダ' })
    .getByRole('button', { name: /^ゴミ箱/ });
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
  page.on('dialog', (dialog) => void dialog.accept());
  await addTodo(page, '洗濯');

  await todoItems(page)
    .filter({ hasText: '洗濯' })
    .getByRole('region', { name: '「洗濯」のヘッダー' })
    .dragTo(trashRow(page));
  await expect(page.getByRole('status')).toHaveText(/「洗濯」をゴミ箱に移動しました。/);

  await trashRow(page).click();
  await page.getByRole('button', { name: '「洗濯」を完全に削除' }).click();
  await expect(page.getByText('ゴミ箱は空です。')).toBeVisible();
  await page.reload();
  await trashRow(page).click();
  await expect(page.getByText('ゴミ箱は空です。')).toBeVisible();
});
