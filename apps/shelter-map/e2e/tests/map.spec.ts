import { currentZoom, expect, mapMarkers, openApp, openColumnFilter, test } from '../fixtures';

test.describe('地図', () => {
  test('ピンをクリックすると、名前・住所・災害種別ごとの指定状況を表示する', async ({ page }) => {
    await openApp(page);
    await openColumnFilter(page, '名前');
    await page.getByPlaceholder('名前で絞り込み').fill('横浜');
    await expect(mapMarkers(page)).toHaveCount(1);

    await mapMarkers(page).click();
    const popup = page.locator('.shelter-popup');
    await expect(popup).toBeVisible();
    await expect(popup.locator('strong')).toHaveText('横浜テスト小学校');
    await expect(popup).toContainText('神奈川県横浜市中区1-1');
    await expect(popup.locator('.shelter-type-ready')).toHaveText(['洪水', '地震']);
    await expect(popup.locator('.shelter-type-not-ready')).toHaveCount(6);
  });

  test('データ中の HTML はタグとして解釈せず、文字のまま表示する', async ({ page }) => {
    await openApp(page);
    await openColumnFilter(page, '住所');
    await page.getByPlaceholder('住所で絞り込み').fill('港区');
    await expect(mapMarkers(page)).toHaveCount(1);

    await mapMarkers(page).click();
    const popup = page.locator('.shelter-popup');
    await expect(popup.locator('strong')).toHaveText('<b>港</b>&テスト広場');
    await expect(popup.locator('b')).toHaveCount(0);
  });

  test('地図タイルを国土地理院の写真に切り替えられる', async ({ page }) => {
    await openApp(page);
    await expect(page.getByRole('radio', { name: 'OpenStreetMap' })).toBeChecked();

    const photoTile = page.waitForRequest(/cyberjapandata\.gsi\.go\.jp\/xyz\/seamlessphoto\//);
    await page.getByRole('radio', { name: '国土地理院 (写真)' }).check();
    await photoTile;
    await expect(page.locator('.leaflet-tile[src*="cyberjapandata"]').first()).toBeAttached();
    await expect(page.locator('.leaflet-tile[src*="openstreetmap"]')).toHaveCount(0);
  });

  test('Ctrl を押しながらスクロールしたときだけズームする', async ({ page }) => {
    await openApp(page);
    await expect.poll(() => currentZoom(page)).toBe(8);
    const box = await page.locator('.leaflet-container').boundingBox();
    if (!box) throw new Error('地図が表示されていません');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    // ホイールだけではページのスクロールに任せ、ズームしない
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(500);
    expect(await currentZoom(page)).toBe(8);

    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -100);
    await page.keyboard.up('Control');
    await expect.poll(() => currentZoom(page)).toBe(9);
  });
});

test.describe('スマートフォン', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test('操作方法の案内がタッチ向けになり、表は横にスクロールできる', async ({ page }) => {
    await openApp(page);

    const hint = page.getByRole('region', { name: '地図の操作方法' });
    await expect(hint.getByText('ピンチ')).toBeVisible();
    await expect(hint.getByText('タップ')).toBeVisible();
    await expect(hint.getByText('クリック')).toBeHidden();

    const scroller = page.getByRole('table').locator('xpath=..');
    const { scrollWidth, clientWidth } = await scroller.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(scrollWidth).toBeGreaterThan(clientWidth);
  });
});
