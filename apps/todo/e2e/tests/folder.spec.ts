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

test('restores the selected and collapsed folders after reloading', async ({ page }) => {
  await createFolder(page, '仕事');
  await createFolder(page, '案件', '仕事');
  await folderNav(page).getByRole('button', { name: /^仕事/ }).click();
  await folderNav(page).getByRole('button', { name: 'フォルダ「仕事」を閉じる' }).click();

  await page.reload();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('仕事');
  await expect(
    folderNav(page).getByRole('button', { name: 'フォルダ「仕事」を開く' }),
  ).toBeVisible();
  await expect(folderNav(page).getByRole('button', { name: /^案件/ })).toBeHidden();
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

test('resizes the folder pane by dragging and keeps the width after reloading', async ({
  page,
}) => {
  const pane = page.locator('#folder-sidebar');
  const handle = page.getByRole('separator', { name: 'フォルダ欄の幅' });
  await expect(handle).toHaveAttribute('aria-valuenow', '240');
  const before = (await pane.boundingBox())?.width ?? 0;

  const box = await handle.boundingBox();
  if (!box) throw new Error('resize handle is not visible');
  const y = box.y + 20;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 100, y, { steps: 5 });
  await page.mouse.up();

  await expect(handle).toHaveAttribute('aria-valuenow', '340');
  expect((await pane.boundingBox())?.width).toBeCloseTo(before + 100, 0);

  await page.reload();
  await expect(handle).toHaveAttribute('aria-valuenow', '340');

  // ダブルクリックで元の幅に戻る
  await handle.dblclick();
  await expect(handle).toHaveAttribute('aria-valuenow', '240');
});
