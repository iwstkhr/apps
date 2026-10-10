import type { Page } from '@playwright/test';
import { addTodo, chooseFromHeaderMenu, expect, openApp, test, todoItems } from '../fixtures';

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

test('moves a todo to another folder by drag and drop', async ({ page }) => {
  await createFolder(page, '仕事');
  await createFolder(page, '家');
  await folderNav(page)
    .getByRole('button', { name: /^すべて/ })
    .click();
  await addTodo(page, '洗濯');
  await page.getByRole('button', { name: '「洗濯」を編集' }).click();
  await page.getByRole('textbox', { name: 'メモ' }).fill('洗剤を用意する');
  await page.getByRole('button', { name: '保存', exact: true }).click();

  // ヘッダーだけをつかめて、操作ボタンは指のカーソル
  const card = todoItems(page).filter({ hasText: '洗濯' });
  const header = card.locator('[draggable="true"]');
  await expect(card).not.toHaveAttribute('draggable', 'true');
  await expect(header).toHaveAttribute('draggable', 'true');
  await expect(header).toHaveCSS('cursor', 'grab');
  await expect(card.getByRole('button', { name: '「洗濯」を編集' })).toHaveCSS('cursor', 'pointer');

  await card
    .getByText('洗剤を用意する')
    .dragTo(folderNav(page).getByRole('button', { name: /^家/ }));
  await card
    .getByRole('combobox', { name: '「洗濯」の優先度' })
    .dragTo(folderNav(page).getByRole('button', { name: /^家/ }));
  await page.reload();
  await expect(card).not.toContainText('フォルダ: 家');

  await header.dragTo(folderNav(page).getByRole('button', { name: /^家/ }));
  await expect(page.getByRole('status')).toHaveText('「洗濯」を「家」に移動しました。');
  await expect(todoItems(page)).toHaveText([/洗濯.*フォルダ: 家/]);
  await page.getByRole('button', { name: '通知を閉じる' }).click();
  await expect(page.getByRole('status')).toBeHidden();
  await expect(todoItems(page)).toHaveText([/洗濯.*フォルダ: 家/]);

  await page.reload();
  await folderNav(page).getByRole('button', { name: /^家/ }).click();
  await expect(todoItems(page)).toHaveText([/洗濯/]);
  await folderNav(page).getByRole('button', { name: /^仕事/ }).click();
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
  await chooseFromHeaderMenu(page, 'エクスポート');
  const path = await (await downloadPromise).path();

  await folderNav(page).getByRole('button', { name: 'フォルダ「家」を削除' }).click();
  await page.getByLabel('インポートするファイル').setInputFiles(path);
  const dialog = page.getByRole('dialog', { name: 'インポート' });
  await expect(dialog).toContainText('TODO 1 件とフォルダ 1 件を読み込みます');
  await dialog.getByRole('button', { name: '置き換え' }).click();

  await folderNav(page).getByRole('button', { name: /^家/ }).click();
  await expect(todoItems(page)).toHaveText([/掃除/]);
});

test('creates and edits folder colors and preserves them after reload and import', async ({
  page,
}) => {
  await folderNav(page).getByRole('button', { name: '新しいフォルダ' }).click();
  const create = page.getByRole('dialog', { name: '新しいフォルダ' });
  await create.getByRole('textbox', { name: 'フォルダ名' }).fill('仕事');
  await expect(create.locator('input[type="color"]')).toHaveCount(0);
  await expect(create.getByRole('radio', { name: '黄色', exact: true })).toBeChecked();
  await create.getByText('青', { exact: true }).click();
  await expect(create.getByRole('radio', { name: '青', exact: true })).toBeChecked();
  await create.getByRole('button', { name: '作成' }).click();
  const icon = folderNav(page).getByRole('button', { name: /^仕事/ }).locator('svg');
  await expect(icon).toHaveCSS('color', 'rgb(37, 99, 235)');
  await expect(page.getByRole('heading', { level: 2 }).locator('svg')).toHaveCSS(
    'color',
    'rgb(37, 99, 235)',
  );

  await folderNav(page).getByRole('button', { name: 'フォルダ「仕事」を編集' }).click();
  const edit = page.getByRole('dialog', { name: 'フォルダを編集' });
  await expect(edit.getByRole('radio', { name: '青', exact: true })).toBeChecked();
  await edit.getByText('赤', { exact: true }).click();
  await expect(edit.getByRole('radio', { name: '赤', exact: true })).toBeChecked();
  await expect(edit.getByRole('radio', { name: '青', exact: true })).not.toBeChecked();
  await edit.getByRole('button', { name: 'キャンセル' }).click();
  await expect(icon).toHaveCSS('color', 'rgb(37, 99, 235)');

  await folderNav(page).getByRole('button', { name: 'フォルダ「仕事」を編集' }).click();
  await edit.getByText('黄色', { exact: true }).click();
  await expect(edit.getByRole('radio', { name: '黄色', exact: true })).toBeChecked();
  await edit.getByRole('radio', { name: '黄色', exact: true }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(edit.getByRole('radio', { name: 'グレー', exact: true })).toBeChecked();
  await edit.getByText('緑', { exact: true }).click();
  await edit.getByRole('button', { name: '保存' }).click();
  await page.reload();
  await expect(icon).toHaveCSS('color', 'rgb(22, 163, 74)');

  const download = page.waitForEvent('download');
  await chooseFromHeaderMenu(page, 'エクスポート');
  const path = await (await download).path();
  await folderNav(page).getByRole('button', { name: 'フォルダ「仕事」を削除' }).click();
  await page.getByLabel('インポートするファイル').setInputFiles(path);
  await page
    .getByRole('dialog', { name: 'インポート' })
    .getByRole('button', { name: '置き換え' })
    .click();
  await expect(icon).toHaveCSS('color', 'rgb(22, 163, 74)');
  await folderNav(page).getByRole('button', { name: /^仕事/ }).click();
  await page.setViewportSize({ width: 375, height: 800 });
  await expect(page.getByRole('heading', { level: 2 }).locator('svg')).toHaveCSS(
    'color',
    'rgb(22, 163, 74)',
  );
});

test('opens the folder list from a button on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await expect(folderNav(page)).toBeHidden();

  const toggle = page.locator('header').getByRole('button', { name: 'フォルダとステータスを開く' });
  await toggle.click();
  await createFolder(page, '買い物');
  // フォルダを選ぶと一覧は畳まれ、ボタンに選んだフォルダが出る
  await expect(folderNav(page)).toBeHidden();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('買い物');
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

test('keeps the folder pane as tall as the window while the list scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  for (let i = 1; i <= 12; i++) await addTodo(page, `タスク ${i}`);

  const pane = page.locator('#folder-sidebar');
  const header = (await page.locator('header').boundingBox())?.height ?? 0;
  const atTop = await pane.boundingBox();
  // ヘッダーの下から画面の下端まで (上下に 16px の余白)
  expect(atTop?.y).toBeCloseTo(header + 16, 0);
  expect((atTop?.y ?? 0) + (atTop?.height ?? 0)).toBeCloseTo(600 - 16, 0);

  // ページの一番下までスクロールしても動かない
  await page.mouse.wheel(0, 10_000);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  expect(await pane.boundingBox()).toEqual(atTop);
});

test('uses a modal slide-out menu without shifting tasks on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  const toggle = page.locator('header').getByRole('button', { name: 'フォルダとステータスを開く' });
  const main = page.locator('#todo-main-column');
  const before = await main.boundingBox();
  const menu = page.getByRole('dialog', { name: 'フォルダとステータス', exact: true });
  const close = page.getByRole('button', { name: 'フォルダとステータスを閉じる', exact: true });

  await toggle.click();
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute('aria-modal', 'true');
  await expect(close).toBeFocused();
  await expect(main).toHaveAttribute('inert', '');
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  expect(await main.boundingBox()).toEqual(before);
  await expect.poll(async () => (await menu.boundingBox())?.x).toBe(0);
  const box = await menu.boundingBox();
  expect(box?.x).toBe(0);
  expect(box?.width).toBeLessThanOrEqual(375 * 0.85);

  // 最初の要素から Shift+Tab でメニューの最後 (ゴミ箱) に回り、外へは出ない
  await page.keyboard.press('Shift+Tab');
  await expect(menu.getByRole('button', { name: /^ゴミ箱/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(toggle).toBeFocused();
  await expect(main).not.toHaveAttribute('inert');
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');

  await toggle.click();
  await close.click();
  await expect(menu).toBeHidden();
  await toggle.click();
  await page.getByRole('button', { name: 'フォルダとステータスの背景を閉じる' }).click({
    position: { x: 365, y: 400 },
  });
  await expect(menu).toBeHidden();
  await expect(toggle).toBeFocused();

  await toggle.click();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(menu).toBeHidden();
  await expect(folderNav(page)).toBeVisible();
  await expect(main).not.toHaveAttribute('inert');
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
});
