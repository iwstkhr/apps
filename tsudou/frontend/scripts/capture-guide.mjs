// 使い方ページ (src/routes/Guide.tsx) の画面キャプチャを、サンプルデータで撮り直す。
//
// 前提: `pnpm run dev:api` と `pnpm run dev` を起動しておく (ローカルの D1 にサンプルの
// イベントが 1 件でき、最後に締め切った状態で残る)。ブラウザはインストール済みの
// Google Chrome を使う (Playwright のブラウザはダウンロードしない)。
//
//   pnpm run guide:capture
//
// 画像は src/assets/guide/ に上書きされる。サイズが変わったら Guide.tsx の width / height も直す。
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = process.env.GUIDE_BASE_URL ?? 'http://localhost:5173';
const OUT = new URL('../src/assets/guide/', import.meta.url).pathname;
// URL 欄に出る localhost を本番風の表記に差し替える (トークンはサンプルなのでそのまま)
const SHOWN_ORIGIN = 'https://tsudou.example.com';

/** 候補日: 1 週間以上先の金曜 19:00 から 3 週ぶん。過去の日時は候補にできないので実行日から決める。 */
function candidateDates() {
  const first = new Date();
  first.setDate(first.getDate() + 7 + ((5 - first.getDay() + 7) % 7));
  return [0, 7, 14].map((offset) => {
    const d = new Date(first);
    d.setDate(first.getDate() + offset);
    return d;
  });
}

const pad = (n) => String(n).padStart(2, '0');
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T19:00`;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });

const newPage = async () => {
  const context = await browser.newContext({
    viewport: { width: 840, height: 1000 },
    deviceScaleFactor: 2,
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    colorScheme: 'light',
  });
  // The guide screenshots document the Japanese interface in both language versions.
  await context.addInitScript(() => localStorage.setItem('tsudou:language', 'ja'));
  return context.newPage();
};

const maskOrigin = (page) =>
  page.evaluate((shown) => {
    for (const el of document.querySelectorAll('code')) {
      el.textContent = el.textContent.replace(location.origin, shown);
    }
  }, SHOWN_ORIGIN);

const card = (page, text) => page.locator('section').filter({ hasText: text }).first();

const shot = async (locator, name) => {
  const page = locator.page();
  await page.waitForLoadState('networkidle');
  await page.mouse.move(0, 0);
  // 再描画で戻らないよう、撮る直前に差し替える
  await maskOrigin(page);
  // A flash message or query update may rerender URL fields during screenshot capture.
  // Keep sample origins masked until capture completes.
  const maskObserver = await page.evaluateHandle((shown) => {
    const mask = () => {
      for (const el of document.querySelectorAll('code')) {
        if (el.textContent.includes(location.origin)) {
          el.textContent = el.textContent.replace(location.origin, shown);
        }
      }
    };
    const observer = new MutationObserver(mask);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    mask();
    return observer;
  }, SHOWN_ORIGIN);
  await locator.screenshot({ path: `${OUT}${name}.png`, animations: 'disabled' });
  await maskObserver.evaluate((observer) => observer.disconnect());
  await maskObserver.dispose();
  console.log(`saved ${name}.png`);
};

try {
  const dates = candidateDates();

  // ------------------------------------------------------------ 主催者: 作成
  const host = await newPage();
  await host.goto(BASE);
  await host.getByLabel('イベント名').fill('チーム歓迎会');
  for (const [i, date] of dates.entries()) {
    if (i > 0) await host.getByRole('button', { name: '＋ 候補を追加' }).click();
    await host.getByLabel(`候補 ${i + 1} の日時`).fill(toLocalInput(date));
  }
  await host.getByLabel('参加費 (任意)').fill('4000');
  await host
    .getByLabel('メモ (任意)')
    .fill('会場: 渋谷駅近くの居酒屋（予約後にお知らせします）\n会費は当日現金でお願いします');
  await host.getByLabel('メモ (任意)').blur();
  await shot(card(host, 'イベントを作成'), 'host-create');

  await host.getByRole('button', { name: 'イベントを作成して URL を発行' }).click();
  await host.getByText('イベントを作成しました').waitFor();
  const [shareUrl, manageUrl] = await host.locator('code').allTextContents();
  await shot(card(host, 'イベントを作成しました'), 'host-created');

  // -------------------------------------------------- 他の参加者の回答 (API)
  const eventId = new URL(shareUrl).pathname.split('/')[2];
  const event = await (await fetch(`${BASE}/api/events/${eventId}`)).json();
  const seeds = [
    ['佐藤 花子', ['YES', 'MAYBE', 'YES'], '少し遅れて参加するかもしれません'],
    ['鈴木 一郎', ['YES', 'NO', 'YES'], null],
    ['高橋 美咲', ['MAYBE', 'YES', 'YES'], null],
  ];
  for (const [name, statuses, message] of seeds) {
    const res = await fetch(`${BASE}/api/events/${eventId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        message,
        choices: event.candidates.map((c, i) => ({ candidateId: c.id, status: statuses[i] })),
      }),
    });
    if (!res.ok) throw new Error(`回答の投入に失敗しました: ${res.status} ${await res.text()}`);
  }

  // ------------------------------------------------------------ 参加者: 回答
  const guest = await newPage();
  await guest.goto(shareUrl);
  await guest.getByRole('heading', { name: 'チーム歓迎会' }).waitFor();
  await shot(guest.locator('main section').first(), 'guest-event');
  await shot(card(guest, '回答状況'), 'guest-status');

  const form = card(guest, '出欠を回答する');
  await guest.getByLabel('お名前').fill('田中 健太');
  const groups = form.getByRole('radiogroup');
  await groups.nth(0).getByRole('radio', { name: '○ 参加' }).click();
  await groups.nth(1).getByRole('radio', { name: '× 不参加' }).click();
  await groups.nth(2).getByRole('radio', { name: '○ 参加' }).click();
  const second = dates[1];
  await guest
    .getByLabel('メッセージ (任意)')
    .fill(`${second.getMonth() + 1}/${second.getDate()} は出張のため参加できません`);
  await guest.getByLabel('メッセージ (任意)').blur();
  await shot(form, 'guest-answer');

  await form.getByRole('button', { name: '回答する' }).click();
  await guest.getByText('回答を保存しました。').waitFor();
  await shot(card(guest, '自分の回答を編集'), 'guest-answered');

  // ------------------------------------------------------------ 主催者: 管理
  const manager = await newPage();
  await manager.goto(manageUrl);
  await manager.getByRole('heading', { name: 'イベントの管理' }).waitFor();
  await shot(card(manager, 'イベントの管理'), 'host-manage-urls');
  await shot(card(manager, '内容を編集'), 'host-manage-edit');
  await shot(card(manager, '回答状況'), 'host-manage-answers');
  await shot(card(manager, '締切と削除'), 'host-manage-close');

  await manager.getByRole('button', { name: '回答を締め切る' }).click();
  await manager.getByText('締切中です。').waitFor();

  // --------------------------------------------------------- 参加者: 締切後
  const late = await newPage();
  await late.goto(shareUrl);
  await late.getByText('締め切られているため').waitFor();
  await shot(card(late, '出欠を回答する'), 'guest-closed');
} finally {
  await browser.close();
}
