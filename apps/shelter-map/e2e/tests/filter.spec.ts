import {
  expect,
  mapMarkers,
  openApp,
  resultCount,
  searchBox,
  tableRows,
  test,
  typeChip,
} from '../fixtures';

test.describe('絞り込み', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await expect(mapMarkers(page)).toHaveCount(4);
  });

  test('名前で検索すると、表と地図の両方に反映される', async ({ page }) => {
    await searchBox(page).fill('  川崎 ');

    await expect(resultCount(page)).toHaveText('1 件');
    await expect(tableRows(page)).toHaveCount(1);
    await expect(tableRows(page).first()).toContainText('川崎テスト公園');
    await expect(mapMarkers(page)).toHaveCount(1);

    // Clearing it restores the original
    await searchBox(page).fill('');
    await expect(resultCount(page)).toHaveText('4 件');
    await expect(mapMarkers(page)).toHaveCount(4);
  });

  test('住所でも検索でき、スペース区切りの語はすべてを含むものに絞り込む', async ({ page }) => {
    await searchBox(page).fill('東京都');
    await expect(resultCount(page)).toHaveText('1 件');
    await expect(tableRows(page).first()).toContainText('東京都港区4-4');

    await searchBox(page).fill('神奈川県 体育館');
    await expect(resultCount(page)).toHaveText('1 件');
    await expect(tableRows(page).first()).toContainText('相模原テスト体育館');
  });

  test('災害種別のチップを複数選ぶと、すべてに対応する避難場所に絞り込む (AND)', async ({
    page,
  }) => {
    await typeChip(page, '地震').click();
    await expect(typeChip(page, '地震')).toHaveAttribute('aria-pressed', 'true');
    await expect(resultCount(page)).toHaveText('3 件');

    await typeChip(page, '津波').click();
    await expect(resultCount(page)).toHaveText('1 件');
    await expect(tableRows(page).first()).toContainText('川崎テスト公園');
    await expect(mapMarkers(page)).toHaveCount(1);

    // Non-matching shelters can be kept on the map and in the table
    await page.getByRole('checkbox', { name: /非該当も/ }).check();
    await expect(resultCount(page)).toHaveText('4 件');
    await expect(mapMarkers(page)).toHaveCount(4);
  });

  test('「条件をクリア」で検索語と災害種別をまとめて解除する', async ({ page }) => {
    const clear = page.getByRole('button', { name: '条件をクリア' });
    await expect(clear).toBeHidden();

    await searchBox(page).fill('テスト');
    await typeChip(page, '洪水').click();
    await expect(resultCount(page)).toHaveText('1 件');

    await clear.click();
    await expect(searchBox(page)).toHaveValue('');
    await expect(typeChip(page, '洪水')).toHaveAttribute('aria-pressed', 'false');
    await expect(resultCount(page)).toHaveText('4 件');
    await expect(clear).toBeHidden();
  });
});
