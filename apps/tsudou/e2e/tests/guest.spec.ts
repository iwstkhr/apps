import { answerCells, createEvent, expect, fillAnswer, test, urlIn } from '../fixtures';

test.describe('参加者', () => {
  test('回答すると回答状況に載り、回答編集 URL で変更・削除できる', async ({
    page,
    text,
    newUser,
  }) => {
    const { shareUrl } = await createEvent(page, text, { title: '歓迎会' });

    const guest = await newUser();
    await guest.goto(shareUrl);
    await fillAnswer(guest, text, { name: '田中', choices: ['参加', '不参加', '未定'] });
    await guest.getByRole('button', { name: text('回答する'), exact: true }).click();
    await expect(guest.getByText(text('回答を保存しました。'))).toBeVisible();
    await expect(answerCells(guest, '田中')).toHaveText(['○', '×', '△']);
    const editUrl = await urlIn(guest, text('回答編集 URL'));
    expect(editUrl).toContain('#a=');

    // 別のブラウザでも、回答編集 URL を開けば自分の回答を直せる
    const sameGuest = await newUser();
    await sameGuest.goto(editUrl);
    await expect(sameGuest.getByLabel(text('お名前'))).toHaveValue('田中');
    await fillAnswer(sameGuest, text, { choices: ['不参加', '参加', '参加'] });
    await sameGuest.getByRole('button', { name: text('回答を更新する') }).click();

    const other = await newUser();
    await other.goto(shareUrl);
    await expect(answerCells(other, '田中')).toHaveText(['×', '○', '○']);

    sameGuest.once('dialog', (dialog) => void dialog.accept());
    await sameGuest.getByRole('button', { name: text('自分の回答を削除') }).click();
    await expect(sameGuest.getByRole('heading', { name: text('出欠を回答する') })).toBeVisible();

    await other.reload();
    await expect(other.getByText(text('まだ回答がありません。'))).toBeVisible();
  });

  test('同じイベントで同じ名前は使えない', async ({ page, text, newUser }) => {
    const { shareUrl } = await createEvent(page, text, { title: '歓迎会' });

    const first = await newUser();
    await first.goto(shareUrl);
    await fillAnswer(first, text, { name: '鈴木', choices: ['参加', '参加', '参加'] });
    await first.getByRole('button', { name: text('回答する'), exact: true }).click();
    await expect(first.getByText(text('回答を保存しました。'))).toBeVisible();

    const second = await newUser();
    await second.goto(shareUrl);
    await fillAnswer(second, text, { name: '鈴木', choices: ['不参加', '不参加', '不参加'] });
    await second.getByRole('button', { name: text('回答する'), exact: true }).click();
    await expect(second.getByText(text('この名前はすでに回答済みです'))).toBeVisible();
    await expect(answerCells(second, '鈴木')).toHaveText(['○', '○', '○']);
  });
});
