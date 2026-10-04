import { type BrowserContext, test as base, type Page } from '@playwright/test';
import { english } from '../frontend/src/lib/translations.ts';

export type Language = 'ja' | 'en';
export type Options = { language: Language };

/** 画面の文言 (日本語の原文) を、表示言語に合わせてアプリと同じ翻訳表で引く。 */
export type Text = (source: string, ...values: (string | number)[]) => string;

type Fixtures = {
  text: Text;
  /** 別の人 (別のブラウザ) としてページを開く。主催者と参加者を分けるのに使う。 */
  newUser: () => Promise<Page>;
};

export const test = base.extend<Fixtures & Options>({
  language: ['ja', { option: true }],

  context: async ({ context, language }, use) => {
    await context.addInitScript((lang) => localStorage.setItem('tsudou:language', lang), language);
    await use(context);
  },

  text: async ({ language }, use) => {
    await use((source, ...values) =>
      (language === 'en' ? (english[source] ?? source) : source).replace(/\{(\d+)\}/g, (_, i) =>
        String(values[Number(i)]),
      ),
    );
  },

  newUser: async ({ browser, baseURL, locale, timezoneId, serviceWorkers, language }, use) => {
    const contexts: BrowserContext[] = [];
    await use(async () => {
      const context = await browser.newContext({ baseURL, locale, timezoneId, serviceWorkers });
      await context.addInitScript(
        (lang) => localStorage.setItem('tsudou:language', lang),
        language,
      );
      contexts.push(context);
      return context.newPage();
    });
    for (const context of contexts) await context.close();
  },
});

export { expect } from '@playwright/test';

/** 1 週間以上先の金曜 19:00 から、1 週おきに count 件。過去の日時は候補にできないので実行日から決める。 */
function candidateInputs(count: number): string[] {
  const first = new Date();
  first.setDate(first.getDate() + 7 + ((5 - first.getDay() + 7) % 7));
  const pad = (n: number) => String(n).padStart(2, '0');
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(first);
    d.setDate(first.getDate() + i * 7);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T19:00`;
  });
}

/** ラベルの付いた URL 欄 (ShareLinkBox) に表示されている URL。 */
export async function urlIn(page: Page, label: string): Promise<string> {
  const url = await page
    .getByText(label, { exact: true })
    .locator('xpath=..')
    .locator('code')
    .textContent();
  if (!url) throw new Error(`${label} が見つかりません`);
  return url;
}

/** トップページからイベントを作り、作成完了画面に出る 2 つの URL を返す。 */
export async function createEvent(
  page: Page,
  text: Text,
  { title, candidates = 3 }: { title: string; candidates?: number },
): Promise<{ shareUrl: string; manageUrl: string }> {
  await page.goto('/');
  await page.getByLabel(text('イベント名')).fill(title);
  for (const [i, value] of candidateInputs(candidates).entries()) {
    if (i > 0) await page.getByRole('button', { name: text('＋ 候補を追加') }).click();
    await page.getByLabel(text('候補 {0} の日時', i + 1)).fill(value);
  }
  await page.getByRole('button', { name: text('イベントを作成して URL を発行') }).click();
  await page.getByRole('heading', { name: text('イベントを作成しました') }).waitFor();
  return {
    shareUrl: await urlIn(page, text('共有用 URL')),
    manageUrl: await urlIn(page, text('管理用 URL')),
  };
}

export type Choice = '参加' | '未定' | '不参加';
const SYMBOLS: Record<Choice, string> = { 参加: '○', 未定: '△', 不参加: '×' };

/** 回答フォームに入力する。choices は候補の順。 */
export async function fillAnswer(
  page: Page,
  text: Text,
  { name, choices, message }: { name?: string; choices: Choice[]; message?: string },
): Promise<void> {
  if (name !== undefined) await page.getByLabel(text('お名前')).fill(name);
  const groups = page.getByRole('radiogroup');
  for (const [i, choice] of choices.entries()) {
    await groups
      .nth(i)
      .getByRole('radio', { name: `${SYMBOLS[choice]} ${text(choice)}`, exact: true })
      .click();
  }
  if (message !== undefined) await page.getByLabel(text('メッセージ (任意)')).fill(message);
}

/** 回答状況の表で、name さんの行 (候補ごとの ○△× のセル)。 */
export function answerCells(page: Page, name: string) {
  return page
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name, exact: false }) })
    .getByRole('cell');
}
