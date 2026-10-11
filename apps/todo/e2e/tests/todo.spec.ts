import { addTodo, chooseFromHeaderMenu, expect, openApp, test, todoItems } from '../fixtures';

test('removes a tag using its close button without filtering and saves the change', async ({
  page,
}) => {
  await addTodo(page, 'タグを整理');
  await page.getByRole('button', { name: '「タグを整理」を編集' }).click();
  await page.getByRole('combobox', { name: 'タグ', exact: true }).fill('仕事, 家');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.setViewportSize({ width: 375, height: 800 });
  await page.getByRole('button', { name: '「タグを整理」からタグ「仕事」を削除' }).click();
  await expect(page.getByRole('button', { name: '#仕事', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: '#家', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'タグで絞り込み' })).toHaveValue('');
  await page.reload();
  await expect(page.getByRole('button', { name: '#仕事', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: '#家', exact: true })).toBeVisible();
});

test('picks several existing tags in a row from the suggestions', async ({ page }) => {
  await addTodo(page, '買い出し');
  await page.getByRole('button', { name: '「買い出し」を編集' }).click();
  await page.getByRole('combobox', { name: 'タグ', exact: true }).fill('家, 買い物, 週末');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('button', { name: '保存', exact: true })).toBeHidden();

  await addTodo(page, '日用品');
  await page.getByRole('button', { name: '「日用品」を編集' }).click();
  const tags = page.getByRole('combobox', { name: 'タグ', exact: true });
  await tags.click();
  const suggestions = page.getByRole('listbox', { name: 'タグの候補' });
  await suggestions.getByRole('option', { name: '#家' }).click();
  // Choosing one does not close the suggestions, so the remaining tags can be chosen in a row
  const options = suggestions.getByRole('option');
  await expect(options).toHaveCount(2);
  await expect(suggestions).not.toContainText('#家');
  await tags.press('ArrowDown');
  const picked = (await options.first().textContent()) ?? '';
  await tags.press('Enter');
  await expect(options).toHaveCount(1);
  await expect(options).not.toHaveText(picked);
  await tags.press('Escape');
  await expect(suggestions).toBeHidden();
  await page.getByRole('button', { name: '保存', exact: true }).click();

  const item = todoItems(page).filter({ hasText: '日用品' });
  await expect(item.getByRole('button', { name: /^#/ })).toHaveText(['#家', picked]);
});

test.beforeEach(async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());
  await openApp(page);
});

test('keeps todos after reloading', async ({ page }) => {
  await page.getByRole('textbox', { name: 'タイトル' }).fill('牛乳を買う');
  await page.getByRole('button', { name: '詳細' }).click();
  await page.getByRole('textbox', { name: 'メモ' }).fill('低脂肪');
  await page.getByRole('combobox', { name: 'タグ', exact: true }).fill('家, 買い物');
  await page.getByLabel('期限', { exact: true }).fill('2000-01-01');
  await page.getByRole('combobox', { name: '優先度' }).selectOption('高');
  await page.getByRole('button', { name: '追加', exact: true }).click();

  await page.reload();
  const item = todoItems(page);
  await expect(item).toHaveCount(1);
  await expect(item).toContainText('牛乳を買う');
  await expect(item).toContainText('低脂肪');
  await expect(item.getByRole('combobox', { name: '「牛乳を買う」の優先度' })).toHaveValue('high');
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
  await chooseFromHeaderMenu(page, 'エクスポート');
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

test('filters by status above the list, also on narrow screens', async ({ page }) => {
  await addTodo(page, '洗濯');
  await addTodo(page, '掃除');
  await page.getByRole('combobox', { name: '「掃除」のステータス' }).selectOption('done');
  const statusTabs = page.getByRole('group', { name: 'ステータス', exact: true });
  await expect(page.getByRole('combobox', { name: 'ステータスで絞り込み' })).toHaveCount(0);
  await statusTabs.getByRole('button', { name: '完了 1', exact: true }).click();
  await expect(statusTabs.getByRole('button', { name: '完了 1', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(todoItems(page)).toHaveText([/掃除/]);
  await expect(statusTabs.getByRole('button', { name: /未完了/ })).toHaveCount(0);
  await statusTabs.getByRole('button', { name: '未着手 1' }).click();
  await expect(statusTabs.getByRole('button', { name: '未着手 1' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(todoItems(page)).toHaveText([/洗濯/]);
  // Even on narrow screens it can be chosen without opening the drawer, and overflow scrolls horizontally
  await page.setViewportSize({ width: 320, height: 800 });
  await statusTabs.getByRole('button', { name: '完了 1', exact: true }).click();
  await expect(todoItems(page)).toHaveText([/掃除/]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test('completes, edits and deletes todos', async ({ page }) => {
  await addTodo(page, '洗濯');
  await addTodo(page, '掃除');

  await page.getByRole('combobox', { name: '「掃除」のステータス' }).selectOption('進行中');
  await page.getByRole('checkbox', { name: '「洗濯」を完了にする' }).check();
  const statusTabs = page.getByRole('group', { name: 'ステータス', exact: true });
  await statusTabs.getByRole('button', { name: '進行中 1' }).click();
  await expect(todoItems(page)).toHaveText([/掃除/]);
  await statusTabs.getByRole('button', { name: 'すべて 2' }).click();

  // The status also persists after reload
  await page.reload();
  await expect(page.getByRole('combobox', { name: '「掃除」のステータス' })).toHaveValue(
    'in_progress',
  );

  await page.getByRole('button', { name: '「掃除」を編集' }).click();
  await todoItems(page).getByRole('textbox', { name: 'タイトル' }).fill('部屋の掃除');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(todoItems(page).filter({ hasText: '部屋の掃除' })).toHaveCount(1);

  await page.getByRole('button', { name: '完了済みをゴミ箱に移動 (1)' }).click();
  await expect(todoItems(page)).toHaveCount(1);

  await page.getByRole('button', { name: '「部屋の掃除」をゴミ箱に移動' }).click();
  await expect(page.getByText(/TODO はまだありません/)).toBeVisible();

  await page.reload();
  await expect(page.getByText(/TODO はまだありません/)).toBeVisible();
});

test('exports and imports todos', async ({ page }) => {
  await addTodo(page, 'バックアップ対象');

  const downloadPromise = page.waitForEvent('download');
  await chooseFromHeaderMenu(page, 'エクスポート');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^todo-export-\d{8}\.json$/);
  const path = await download.path();

  // Delete once, then import again
  await page.getByRole('button', { name: '「バックアップ対象」をゴミ箱に移動' }).click();
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

test('renders Markdown memos and preserves their source when editing and reloading', async ({
  page,
}) => {
  await addTodo(page, '手順を確認');
  const memo =
    '## 準備\n\n**重要**\n\n- 資料を読む\n- メールを書く\n\n[資料](https://example.com/docs)\n\n```js\nconst value = 1;\n```';
  await page.getByRole('button', { name: '「手順を確認」を編集' }).click();
  await page.getByRole('textbox', { name: 'メモ' }).fill(memo);
  await page.getByRole('button', { name: '保存', exact: true }).click();
  const card = todoItems(page).filter({ hasText: '手順を確認' });
  await expect(todoItems(page)).toHaveCount(1);
  await expect(card.getByRole('heading', { name: '準備' })).toBeVisible();
  await expect(card.locator('strong')).toHaveText('重要');
  await expect(card.getByRole('listitem')).toHaveCount(2);
  await expect(card.getByRole('link', { name: '資料' })).toHaveAttribute(
    'href',
    'https://example.com/docs',
  );
  await expect(card.locator('pre code')).toHaveText('const value = 1;\n');
  await page.reload();
  await expect(card.getByRole('heading', { name: '準備' })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 800 });
  const bounds = await card.locator('.todo-memo').boundingBox();
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(375);
  await page.getByRole('button', { name: '「手順を確認」を編集' }).click();
  await expect(page.getByRole('textbox', { name: 'メモ' })).toHaveValue(memo);
});

test('changes task priority from the list and persists it after reloading', async ({ page }) => {
  await addTodo(page, '優先度を変更');
  const priority = page.getByRole('combobox', { name: '「優先度を変更」の優先度' });
  await priority.selectOption('high');
  await expect(priority).toHaveValue('high');
  await page.reload();
  await expect(priority).toHaveValue('high');
  await page.setViewportSize({ width: 375, height: 800 });
  await priority.selectOption('low');
  await expect(priority).toHaveValue('low');
  await page.reload();
  await expect(priority).toHaveValue('low');
});

test('changes the due date from the list and persists it after reloading', async ({ page }) => {
  await addTodo(page, '期限を変更');
  const due = page.getByLabel('「期限を変更」の期限');
  await due.fill('2000-01-01');
  await expect(todoItems(page)).toHaveText([/期限: 2000\/01\/01 \(期限切れ\)/]);
  await page.reload();
  await expect(due).toHaveValue('2000-01-01');
  await due.fill('');
  await expect(todoItems(page)).not.toContainText('期限:');
});

test('adds the next occurrence of a weekly todo when it is completed', async ({ page }) => {
  await page.getByRole('textbox', { name: 'タイトル' }).fill('ゴミ出し');
  await page.getByRole('button', { name: '詳細' }).click();
  await page.getByLabel('期限', { exact: true }).fill('2026-10-09');
  await page.getByRole('combobox', { name: '繰り返し' }).selectOption({ label: '毎週' });
  await page.getByRole('button', { name: '追加', exact: true }).click();
  await expect(todoItems(page)).toHaveText([/繰り返し: 毎週/]);

  await page.getByRole('checkbox', { name: '「ゴミ出し」を完了にする' }).check();
  // Count from the original due date, skipping occurrences in the past to land on today or later
  const status = page.getByRole('status');
  await expect(status).toHaveText(/「ゴミ出し」の次の回を \d{4}\/\d{2}\/\d{2} に追加しました。/);
  await expect(todoItems(page)).toHaveCount(2);

  await page.reload();
  await expect(page.getByText('読み込み中…')).toBeHidden();
  await expect(todoItems(page)).toHaveCount(2);
  await expect(todoItems(page).filter({ hasText: '繰り返し: 毎週' })).toHaveCount(1);
  await expect(page.getByRole('checkbox', { name: '「ゴミ出し」を完了にする' })).toHaveCount(1);
});
