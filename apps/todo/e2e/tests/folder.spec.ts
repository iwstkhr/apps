import type { Page } from '@playwright/test';
import { addTodo, expect, openApp, test, todoItems } from '../fixtures';

test.beforeEach(async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());
  await openApp(page);
});

function folderNav(page: Page) {
  return page.getByRole('navigation', { name: 'フォルダ' });
}

async function createFolder(page: Page, name: string, parent?: string) {
  await folderNav(page)
    .getByRole('button', {
      name: parent ? `フォルダ「${parent}」の中にフォルダを追加` : '新しいフォルダ',
    })
    .click();
  const dialog = page.getByRole('dialog', { name: '新しいフォルダ' });
  await dialog.getByRole('textbox', { name: 'フォルダ名' }).fill(name);
  await dialog.getByRole('button', { name: '作成' }).click();
  await expect(dialog).toBeHidden();
}

test('organizes todos in nested folders and keeps them after reloading', async ({ page }) => {
  await createFolder(page, '仕事');
  await createFolder(page, '案件', '仕事');
  await addTodo(page, '見積もりを出す');

  await page.reload();
  await folderNav(page).getByRole('button', { name: /^仕事/ }).click();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('仕事');
  await expect(todoItems(page)).toHaveText([/見積もりを出す.*フォルダ: 仕事 \/ 案件/]);

  await folderNav(page)
    .getByRole('button', { name: /^未分類/ })
    .click();
  await expect(page.getByText('ここに TODO はありません。')).toBeVisible();
});

test('moves todos to unfiled when their folder is deleted', async ({ page }) => {
  await createFolder(page, '旅行');
  await addTodo(page, '切符を取る');

  await folderNav(page).getByRole('button', { name: 'フォルダ「旅行」を削除' }).click();
  await expect(folderNav(page).getByText('フォルダはまだありません。')).toBeVisible();
  await folderNav(page)
    .getByRole('button', { name: /^未分類/ })
    .click();
  await expect(todoItems(page)).toHaveText([/切符を取る/]);
});

test('exports and imports folders', async ({ page }) => {
  await createFolder(page, '家');
  await addTodo(page, '掃除');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'エクスポート' }).click();
  const path = await (await downloadPromise).path();

  await folderNav(page).getByRole('button', { name: 'フォルダ「家」を削除' }).click();
  await page.getByLabel('インポートするファイル').setInputFiles(path);
  const dialog = page.getByRole('dialog', { name: 'インポート' });
  await expect(dialog).toContainText('TODO 1 件とフォルダ 1 件を読み込みます');
  await dialog.getByRole('button', { name: '置き換え' }).click();

  await folderNav(page).getByRole('button', { name: /^家/ }).click();
  await expect(todoItems(page)).toHaveText([/掃除/]);
});

test('opens the folder list from a button on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await expect(folderNav(page)).toBeHidden();

  const toggle = page.getByRole('button', { name: 'フォルダ: すべて' });
  await toggle.click();
  await createFolder(page, '買い物');
  // フォルダを選ぶと一覧は畳まれ、ボタンに選んだフォルダが出る
  await expect(folderNav(page)).toBeHidden();
  await expect(page.getByRole('button', { name: 'フォルダ: 買い物' })).toBeVisible();
});
