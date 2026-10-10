import { addTodo, expect, openApp, test, todoItems } from '../fixtures';

test.beforeEach(async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());
  await openApp(page);
});

test('keeps todos after reloading', async ({ page }) => {
  await page.getByRole('textbox', { name: 'タイトル' }).fill('牛乳を買う');
  await page.getByRole('button', { name: '詳細' }).click();
  await page.getByRole('textbox', { name: 'メモ' }).fill('低脂肪');
  await page.getByRole('combobox', { name: 'タグ', exact: true }).fill('家, 買い物');
  await page.getByLabel('期限').fill('2000-01-01');
  await page.getByRole('combobox', { name: '優先度' }).selectOption('高');
  await page.getByRole('button', { name: '追加', exact: true }).click();

  await page.reload();
  const item = todoItems(page);
  await expect(item).toHaveCount(1);
  await expect(item).toContainText('牛乳を買う');
  await expect(item).toContainText('低脂肪');
  await expect(item).toContainText('優先度: 高');
  await expect(item).toContainText('期限: 2000/01/01 (期限切れ)');
  await expect(item.getByRole('button', { name: '#買い物' })).toBeVisible();
});

test('customizes task order by dragging and buttons and keeps it through reload and export', async ({
  page,
}) => {
  await addTodo(page, 'タスク A');
  await addTodo(page, 'タスク B');
  await addTodo(page, 'タスク C');
  const sort = page.getByRole('combobox', { name: '並び順' });
  await sort.selectOption('custom');
  await expect(todoItems(page)).toHaveText([/タスク C/, /タスク B/, /タスク A/]);
  const card = (title: string) => todoItems(page).filter({ hasText: title });
  await card('タスク A')
    .locator('[draggable="true"]')
    .dragTo(card('タスク C'), { targetPosition: { x: 20, y: 3 } });
  await expect(todoItems(page)).toHaveText([/タスク A/, /タスク C/, /タスク B/]);
  await page.getByRole('button', { name: '「タスク B」を上へ移動' }).click();
  await expect(todoItems(page)).toHaveText([/タスク A/, /タスク B/, /タスク C/]);
  await page.getByRole('checkbox', { name: '「タスク A」を完了にする' }).check();
  await expect(todoItems(page)).toHaveText([/タスク A/, /タスク B/, /タスク C/]);
  await page.reload();
  await expect(sort).toHaveValue('custom');
  await expect(todoItems(page)).toHaveText([/タスク A/, /タスク B/, /タスク C/]);
  await sort.selectOption('created');
  await expect(page.getByRole('button', { name: /上へ移動/ })).toHaveCount(0);
  await sort.selectOption('custom');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'エクスポート' }).click();
  const path = await (await download).path();
  await page.getByRole('button', { name: '「タスク B」を下へ移動' }).click();
  await page.getByLabel('インポートするファイル').setInputFiles(path);
  await page
    .getByRole('dialog', { name: 'インポート' })
    .getByRole('button', { name: '置き換え' })
    .click();
  await expect(todoItems(page)).toHaveText([/タスク A/, /タスク B/, /タスク C/]);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.getByRole('button', { name: '「タスク C」を上へ移動' }).click();
  await expect(todoItems(page)).toHaveText([/タスク A/, /タスク C/, /タスク B/]);
  await addTodo(page, 'タスク D');
  await expect(todoItems(page)).toHaveText([/タスク A/, /タスク C/, /タスク B/, /タスク D/]);
});

test('filters from the status pane and its narrow-screen toggle', async ({ page }) => {
  await addTodo(page, '洗濯');
  await addTodo(page, '掃除');
  await page.getByRole('combobox', { name: '「掃除」のステータス' }).selectOption('done');
  const sidebar = page.getByRole('navigation', { name: 'ステータス', exact: true });
  await expect(page.getByRole('combobox', { name: 'ステータスで絞り込み' })).toHaveCount(0);
  await sidebar.getByRole('button', { name: '完了 1', exact: true }).click();
  await expect(sidebar.getByRole('button', { name: '完了 1', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(todoItems(page)).toHaveText([/掃除/]);
  await expect(sidebar.getByRole('button', { name: /未完了/ })).toHaveCount(0);
  await sidebar.getByRole('button', { name: '未着手 1' }).click();
  await expect(sidebar.getByRole('button', { name: '未着手 1' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(todoItems(page)).toHaveText([/洗濯/]);
  await page.setViewportSize({ width: 375, height: 800 });
  await expect(sidebar).toBeHidden();
  await page.getByRole('button', { name: 'メニューを開く' }).click();
  await sidebar.getByRole('button', { name: '完了 1', exact: true }).click();
  await expect(sidebar).toBeHidden();
  await expect(todoItems(page)).toHaveText([/掃除/]);
});

test('completes, edits and deletes todos', async ({ page }) => {
  await addTodo(page, '洗濯');
  await addTodo(page, '掃除');

  await page.getByRole('combobox', { name: '「掃除」のステータス' }).selectOption('進行中');
  await page.getByRole('checkbox', { name: '「洗濯」を完了にする' }).check();
  const sidebar = page.getByRole('navigation', { name: 'ステータス', exact: true });
  await sidebar.getByRole('button', { name: '進行中 1' }).click();
  await expect(todoItems(page)).toHaveText([/掃除/]);
  await sidebar.getByRole('button', { name: 'すべて 2' }).click();

  // ステータスもリロード後に残る
  await page.reload();
  await expect(page.getByRole('combobox', { name: '「掃除」のステータス' })).toHaveValue(
    'in_progress',
  );

  await page.getByRole('button', { name: '「掃除」を編集' }).click();
  await todoItems(page).getByRole('textbox', { name: 'タイトル' }).fill('部屋の掃除');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(todoItems(page).filter({ hasText: '部屋の掃除' })).toHaveCount(1);

  await page.getByRole('button', { name: '完了済みを削除 (1)' }).click();
  await expect(todoItems(page)).toHaveCount(1);

  await page.getByRole('button', { name: '「部屋の掃除」を削除' }).click();
  await expect(page.getByText(/TODO はまだありません/)).toBeVisible();

  await page.reload();
  await expect(page.getByText(/TODO はまだありません/)).toBeVisible();
});

test('exports and imports todos', async ({ page }) => {
  await addTodo(page, 'バックアップ対象');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'エクスポート' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^todo-export-\d{8}\.json$/);
  const path = await download.path();

  // 一度消してから読み込み直す
  await page.getByRole('button', { name: '「バックアップ対象」を削除' }).click();
  await expect(page.getByText(/TODO はまだありません/)).toBeVisible();

  await page.getByLabel('インポートするファイル').setInputFiles(path);
  const dialog = page.getByRole('dialog', { name: 'インポート' });
  await expect(dialog).toContainText('TODO 1 件とフォルダ 0 件を読み込みます');
  await dialog.getByRole('button', { name: '置き換え' }).click();

  await expect(page.getByRole('status')).toHaveText(
    'TODO 1 件とフォルダ 0 件をインポートしました。',
  );
  await expect(todoItems(page)).toHaveText([/バックアップ対象/]);
  await page.reload();
  await expect(todoItems(page)).toHaveCount(1);
});

test('rejects a file from another app', async ({ page }) => {
  await page.getByLabel('インポートするファイル').setInputFiles({
    name: 'other.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"foo":1}'),
  });
  await expect(page.getByRole('alert')).toHaveText(
    'このアプリでエクスポートしたファイルではありません。',
  );
});
