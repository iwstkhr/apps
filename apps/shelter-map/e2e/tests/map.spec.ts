import { gzipSync } from 'node:zlib';
import {
  currentZoom,
  expect,
  feature,
  mapMarkers,
  openApp,
  resultCount,
  searchBox,
  tableRows,
  test,
} from '../fixtures';

test.describe('地図', () => {
  test('ピンをクリックすると、名前・住所・災害種別ごとの指定状況を表示する', async ({ page }) => {
    await openApp(page);
    await searchBox(page).fill('横浜');
    await expect(mapMarkers(page)).toHaveCount(1);

    await mapMarkers(page).click();
    const popup = page.locator('.shelter-popup');
    await expect(popup).toBeVisible();
    await expect(popup.locator('strong')).toHaveText('横浜テスト小学校');
    await expect(popup).toContainText('神奈川県横浜市中区1-1');
    await expect(popup.locator('.shelter-type-ready')).toHaveText(['洪水', '地震']);
    await expect(popup.locator('.shelter-type-not-ready')).toHaveCount(6);
    await expect(popup.getByRole('link', { name: '経路を開く (Google マップ)' })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=35.444,139.638',
    );
  });

  test('データ中の HTML はタグとして解釈せず、文字のまま表示する', async ({ page }) => {
    await openApp(page);
    await searchBox(page).fill('港区');
    await expect(mapMarkers(page)).toHaveCount(1);

    await mapMarkers(page).click();
    const popup = page.locator('.shelter-popup');
    await expect(popup.locator('strong')).toHaveText('<b>港</b>&テスト広場');
    await expect(popup.locator('b')).toHaveCount(0);
  });

  test('表の行を選ぶと地図がその避難場所へ移動してポップアップを開き、ピンを選ぶと行が強調される', async ({
    page,
  }) => {
    await openApp(page);

    await tableRows(page).filter({ hasText: '川崎テスト公園' }).click();
    const popup = page.locator('.shelter-popup');
    await expect(popup.locator('strong')).toHaveText('川崎テスト公園');
    await expect.poll(() => currentZoom(page)).toBe(16);
    await expect(tableRows(page).filter({ hasText: '川崎テスト公園' })).toHaveAttribute(
      'aria-current',
      'true',
    );

    // Only the selected shelter is inside the zoomed-in viewport
    await page.getByRole('checkbox', { name: '地図の表示範囲のみ' }).check();
    await expect(resultCount(page)).toHaveText('1 件');
    await expect(page.getByText('/ 該当 4 件')).toBeVisible();

    // Closing the popup clears the selection
    await popup.locator('.leaflet-popup-close-button').click();
    await expect(tableRows(page).first()).not.toHaveAttribute('aria-current');

    await mapMarkers(page).click();
    await expect(tableRows(page).first()).toHaveAttribute('aria-current', 'true');
  });

  test('ピンを選ぶと、一覧の上下どちらにあっても行が見出しに隠れず表示される', async ({ page }) => {
    // Enough shelters that the table scrolls, spread out so each pin can be clicked
    const shelters = Array.from({ length: 60 }, (_, i) =>
      feature(
        String(i + 1),
        `グリッド避難所${i + 1}`,
        `神奈川県テスト市${i + 1}`,
        [138.2 + (i % 10) * 0.3, 34.9 + Math.floor(i / 10) * 0.2],
        { 地震: '1' },
      ),
    );
    await page.route('**/assets/mergeFromCity_2.geojson.gz', (route) =>
      route.fulfill({
        contentType: 'application/gzip',
        body: gzipSync(JSON.stringify({ type: 'FeatureCollection', features: shelters })),
      }),
    );
    await openApp(page);
    await expect(mapMarkers(page)).toHaveCount(60);

    const scroller = page.getByRole('table').locator('xpath=..');
    const header = page.getByRole('table').getByRole('row').first();
    const expectSelectedRowVisible = async (name: string) => {
      const row = tableRows(page).filter({
        has: page.getByRole('cell', { name, exact: true }),
      });
      await expect(row).toHaveAttribute('aria-current', 'true');
      const [rowBox, headerBox, scrollerBox] = await Promise.all([
        row.boundingBox(),
        header.boundingBox(),
        scroller.boundingBox(),
      ]);
      if (!rowBox || !headerBox || !scrollerBox) throw new Error('行が表示されていません');
      expect(rowBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 1);
      expect(rowBox.y + rowBox.height).toBeLessThanOrEqual(scrollerBox.y + scrollerBox.height + 1);
    };

    // A row below the visible part of the table (not the last one, which the scroll end clamps)
    await page.getByTitle('グリッド避難所20', { exact: true }).click();
    await expectSelectedRowVisible('グリッド避難所20');

    // A row above it, after scrolling the table to the bottom (reload so the popup's auto-pan
    // has not moved the next pin out of view)
    await openApp(page);
    await expect(mapMarkers(page)).toHaveCount(60);
    await scroller.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.getByTitle('グリッド避難所30', { exact: true }).click();
    await expectSelectedRowVisible('グリッド避難所30');
  });

  test('地図タイルを国土地理院の写真に切り替えられる', async ({ page }) => {
    await openApp(page);
    await expect(page.getByRole('radio', { name: '地図' })).toBeChecked();

    const photoTile = page.waitForRequest(/cyberjapandata\.gsi\.go\.jp\/xyz\/seamlessphoto\//);
    // The radio is visually hidden inside its segment button, so click the label
    await page.getByRole('group', { name: '地図タイル' }).getByText('写真').click();
    await expect(page.getByRole('radio', { name: '写真' })).toBeChecked();
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

    // The wheel alone scrolls the page and does not zoom
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(500);
    expect(await currentZoom(page)).toBe(8);

    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -100);
    await page.keyboard.up('Control');
    await expect.poll(() => currentZoom(page)).toBe(9);
  });
});

test.describe('現在地', () => {
  test.use({
    geolocation: { latitude: 35.531, longitude: 139.703 },
    permissions: ['geolocation'],
  });

  test('現在地ボタンで現在地へ移動し、近くの避難場所だけが表示範囲に入る', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: '現在地を表示' }).click();

    await expect.poll(() => currentZoom(page)).toBe(15);
    await page.getByRole('checkbox', { name: '地図の表示範囲のみ' }).check();
    await expect(resultCount(page)).toHaveText('1 件');
    await expect(tableRows(page).first()).toContainText('川崎テスト公園');
  });
});

test.describe('位置情報が許可されていないとき', () => {
  test('現在地ボタンを押すと理由を表示し、閉じられる', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: '現在地を表示' }).click();

    const alert = page.getByRole('alert');
    await expect(alert).toContainText('位置情報の利用が許可されていません');
    await alert.getByRole('button', { name: '閉じる' }).click();
    await expect(alert).toBeHidden();
  });
});

test.describe('スマートフォン', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test('操作方法の案内は折りたたまれていて、開くとタッチ向けの説明になる', async ({ page }) => {
    await openApp(page);

    const hint = page.getByRole('region', { name: '地図の操作方法' });
    await expect(hint).toBeHidden();
    await page.getByRole('button', { name: '地図の操作方法を表示' }).click();
    await expect(hint.getByText('ピンチ')).toBeVisible();
    await expect(hint.getByText('タップ')).toBeVisible();
    await expect(hint.getByText('クリック')).toBeHidden();
  });

  test('データの読み込み前に一覧へ切り替えても、読み込み後に一覧が表示される', async ({ page }) => {
    // Hold the data back until the list tab is open
    let releaseData: () => void = () => {};
    const dataHeld = new Promise<void>((resolve) => {
      releaseData = resolve;
    });
    await page.route('**/assets/mergeFromCity_2.geojson.gz', async (route) => {
      await dataHeld;
      await route.fallback();
    });

    await page.goto('/');
    await page.getByRole('tab', { name: /一覧/ }).click();
    releaseData();

    await expect(page.getByRole('tab', { name: /一覧/ })).toContainText('(4)');
    await expect(tableRows(page)).toHaveCount(4);
  });

  test('地図と一覧をタブで切り替え、一覧はカード表示で、選ぶと地図に戻って表示する', async ({
    page,
  }) => {
    await openApp(page);

    const mapTab = page.getByRole('tab', { name: '地図' });
    const listTab = page.getByRole('tab', { name: /一覧/ });
    await expect(mapTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('table')).toBeHidden();
    await expect(listTab).toContainText('(4)');

    await listTab.click();
    await expect(page.locator('.leaflet-container')).toBeHidden();
    const table = page.getByRole('table');
    await expect(table.getByRole('columnheader')).toHaveCount(0);
    const scroller = table.locator('xpath=..');
    const { scrollWidth, clientWidth } = await scroller.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    await tableRows(page).filter({ hasText: '川崎テスト公園' }).click();
    await expect(mapTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.shelter-popup strong')).toHaveText('川崎テスト公園');
    await expect.poll(() => currentZoom(page)).toBe(16);
  });
});
