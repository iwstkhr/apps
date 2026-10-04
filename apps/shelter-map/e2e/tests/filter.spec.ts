import {
  expect,
  mapMarkers,
  openApp,
  openColumnFilter,
  resultCount,
  tableRows,
  test,
} from '../fixtures';

test.describe('絞り込み', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await expect(mapMarkers(page)).toHaveCount(4);
  });

  test('名前で絞り込むと、表と地図の両方に反映される', async ({ page }) => {
    await openColumnFilter(page, '名前');
    await page.getByPlaceholder('名前で絞り込み').fill('  川崎 ');

    await expect(resultCount(page)).toHaveText('1 件');
    await expect(tableRows(page)).toHaveCount(1);
    await expect(tableRows(page).first()).toContainText('川崎テスト公園');
    await expect(mapMarkers(page)).toHaveCount(1);

    // 空にすると元に戻る
    await page.getByPlaceholder('名前で絞り込み').fill('');
    await expect(resultCount(page)).toHaveText('4 件');
    await expect(mapMarkers(page)).toHaveCount(4);
  });

  test('住所で絞り込める', async ({ page }) => {
    await openColumnFilter(page, '住所');
    await page.getByPlaceholder('住所で絞り込み').fill('東京都');

    await expect(resultCount(page)).toHaveText('1 件');
    await expect(tableRows(page).first()).toContainText('東京都港区4-4');
  });

  test('災害種別の「指定あり」「指定なし」を組み合わせて絞り込める (AND)', async ({ page }) => {
    await openColumnFilter(page, '地震');
    await page.getByLabel('災害種別で絞り込み').selectOption('yes');
    await expect(resultCount(page)).toHaveText('3 件');

    await openColumnFilter(page, '津波');
    await page.getByLabel('災害種別で絞り込み').selectOption('no');
    await expect(resultCount(page)).toHaveText('2 件');
    await expect(tableRows(page).filter({ hasText: '川崎テスト公園' })).toHaveCount(0);
    await expect(mapMarkers(page)).toHaveCount(2);
  });

  test('絞り込み中の列はアイコンが強調され、外側をクリックすると入力欄が閉じる', async ({
    page,
  }) => {
    const toggle = page.getByRole('button', { name: '名前のフィルター' });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.getByPlaceholder('名前で絞り込み').fill('テスト');

    await page.getByRole('heading', { name: '指定緊急避難場所マップ' }).click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByPlaceholder('名前で絞り込み')).toBeHidden();
    await expect(toggle).toHaveClass(/bg-blue-100/);

    // 閉じても絞り込みは残る
    await toggle.click();
    await expect(page.getByPlaceholder('名前で絞り込み')).toHaveValue('テスト');
  });
});
