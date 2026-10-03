// 使い方ページ (src/routes/Guide.tsx) の画面キャプチャを、サンプルデータで撮り直す。
//
// 前提: `pnpm run dev:api` と `pnpm run dev` を起動しておく (ローカルの D1 にサンプルの
// イベントが言語ごとに 1 件ずつでき、最後に締め切った状態で残る)。ブラウザはインストール済みの
// Google Chrome を使う (Playwright のブラウザはダウンロードしない)。
//
//   pnpm run guide:capture
//
// 画像は表示言語ごとに src/assets/guide/<ja|en>/ に上書きされ、寸法は
// src/assets/guide/sizes.json に書き出される (Guide.tsx が読む)。
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { english } from '../src/lib/translations.ts';

const BASE = process.env.GUIDE_BASE_URL ?? 'http://localhost:5173';
const OUT = new URL('../src/assets/guide/', import.meta.url).pathname;
const SCALE = 2;
// URL 欄に出る localhost を本番風の表記に差し替える (トークンはサンプルなのでそのまま)
const SHOWN_ORIGIN = 'https://tsudou.example.com';

/** 言語ごとのブラウザ設定とサンプルデータ。入力内容は翻訳されないので、言語ごとに用意する。 */
const LANGUAGES = {
  ja: {
    locale: 'ja-JP',
    title: 'チーム歓迎会',
    memo: '会場: 渋谷駅近くの居酒屋（予約後にお知らせします）\n会費は当日現金でお願いします',
    respondents: [
      ['佐藤 花子', ['YES', 'MAYBE', 'YES'], '少し遅れて参加するかもしれません'],
      ['鈴木 一郎', ['YES', 'NO', 'YES'], null],
      ['高橋 美咲', ['MAYBE', 'YES', 'YES'], null],
    ],
    guest: '田中 健太',
    guestMessage: (d) => `${d.getMonth() + 1}/${d.getDate()} は出張のため参加できません`,
  },
  en: {
    locale: 'en-US',
    title: 'Team welcome party',
    memo: 'Venue: a restaurant near Shibuya Station (details after booking)\nPlease pay the fee in cash on the day',
    respondents: [
      ['Hanako Sato', ['YES', 'MAYBE', 'YES'], 'I might arrive a little late'],
      ['Ichiro Suzuki', ['YES', 'NO', 'YES'], null],
      ['Misaki Takahashi', ['MAYBE', 'YES', 'YES'], null],
    ],
    guest: 'Kenta Tanaka',
    guestMessage: (d) =>
      `I can't make it on ${d.getMonth() + 1}/${d.getDate()} due to a business trip`,
  },
};

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

const browser = await chromium.launch({ channel: 'chrome', headless: true });

const maskOrigin = (page) =>
  page.evaluate((shown) => {
    for (const el of document.querySelectorAll('code')) {
      el.textContent = el.textContent.replace(location.origin, shown);
    }
  }, SHOWN_ORIGIN);

const card = (page, text) => page.locator('section').filter({ hasText: text }).first();

/** 画像の寸法 (CSS ピクセル)。Guide.tsx の width / height に使う。 */
const sizes = {};

/** 1 言語ぶんを撮る。 */
async function capture(language) {
  const sample = LANGUAGES[language];
  const out = `${OUT}${language}/`;
  mkdirSync(out, { recursive: true });
  sizes[language] = {};

  /** 画面の文言を、アプリと同じ翻訳表で撮影する言語に合わせる。 */
  const text = (source, ...values) =>
    (language === 'en' ? (english[source] ?? source) : source).replace(/\{(\d+)\}/g, (_, i) =>
      String(values[Number(i)]),
    );

  const newPage = async () => {
    const context = await browser.newContext({
      viewport: { width: 840, height: 1000 },
      deviceScaleFactor: SCALE,
      locale: sample.locale,
      timezoneId: 'Asia/Tokyo',
      colorScheme: 'light',
    });
    await context.addInitScript((lang) => localStorage.setItem('tsudou:language', lang), language);
    return context.newPage();
  };

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
    const png = await locator.screenshot({ path: `${out}${name}.png`, animations: 'disabled' });
    await maskObserver.evaluate((observer) => observer.disconnect());
    await maskObserver.dispose();
    // PNG の IHDR から幅・高さを読む
    sizes[language][name] = {
      width: Math.round(png.readUInt32BE(16) / SCALE),
      height: Math.round(png.readUInt32BE(20) / SCALE),
    };
    console.log(`saved ${language}/${name}.png`);
  };

  const dates = candidateDates();

  // ------------------------------------------------------------ 主催者: 作成
  const host = await newPage();
  await host.goto(BASE);
  await host.getByLabel(text('イベント名')).fill(sample.title);
  for (const [i, date] of dates.entries()) {
    if (i > 0) await host.getByRole('button', { name: text('＋ 候補を追加') }).click();
    await host.getByLabel(text('候補 {0} の日時', i + 1)).fill(toLocalInput(date));
  }
  await host.getByLabel(text('参加費 (任意)')).fill('4000');
  await host.getByLabel(text('メモ (任意)')).fill(sample.memo);
  await host.getByLabel(text('メモ (任意)')).blur();
  await shot(card(host, text('イベントを作成')), 'host-create');

  await host.getByRole('button', { name: text('イベントを作成して URL を発行') }).click();
  await host.getByText(text('イベントを作成しました')).waitFor();
  const [shareUrl, manageUrl] = await host.locator('code').allTextContents();
  await shot(card(host, text('イベントを作成しました')), 'host-created');

  // -------------------------------------------------- 他の参加者の回答 (API)
  const eventId = new URL(shareUrl).pathname.split('/')[2];
  const event = await (await fetch(`${BASE}/api/events/${eventId}`)).json();
  for (const [name, statuses, message] of sample.respondents) {
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
  await guest.getByRole('heading', { name: sample.title }).waitFor();
  await shot(guest.locator('main section').first(), 'guest-event');
  await shot(card(guest, text('回答状況')), 'guest-status');

  const form = card(guest, text('出欠を回答する'));
  await guest.getByLabel(text('お名前')).fill(sample.guest);
  const groups = form.getByRole('radiogroup');
  const yes = `○ ${text('参加')}`;
  const no = `× ${text('不参加')}`;
  await groups.nth(0).getByRole('radio', { name: yes }).click();
  await groups.nth(1).getByRole('radio', { name: no }).click();
  await groups.nth(2).getByRole('radio', { name: yes }).click();
  await guest.getByLabel(text('メッセージ (任意)')).fill(sample.guestMessage(dates[1]));
  await guest.getByLabel(text('メッセージ (任意)')).blur();
  await shot(form, 'guest-answer');

  await form.getByRole('button', { name: text('回答する') }).click();
  await guest.getByText(text('回答を保存しました。')).waitFor();
  await shot(card(guest, text('自分の回答を編集')), 'guest-answered');

  // ------------------------------------------------------------ 主催者: 管理
  const manager = await newPage();
  await manager.goto(manageUrl);
  await manager.getByRole('heading', { name: text('イベントの管理') }).waitFor();
  await shot(card(manager, text('イベントの管理')), 'host-manage-urls');
  await shot(card(manager, text('内容を編集')), 'host-manage-edit');
  await shot(card(manager, text('回答状況')), 'host-manage-answers');
  await shot(card(manager, text('締切と削除')), 'host-manage-close');

  await manager.getByRole('button', { name: text('回答を締め切る') }).click();
  await manager.getByText(text('締切中です。参加者は回答できません。')).waitFor();

  // --------------------------------------------------------- 参加者: 締切後
  const late = await newPage();
  await late.goto(shareUrl);
  await late.getByText(text('このイベントは締め切られているため、回答できません。')).waitFor();
  await shot(card(late, text('出欠を回答する')), 'guest-closed');
}

try {
  for (const language of Object.keys(LANGUAGES)) await capture(language);
  writeFileSync(`${OUT}sizes.json`, `${JSON.stringify(sizes, null, 2)}\n`);
  console.log('saved sizes.json');
} finally {
  await browser.close();
}
