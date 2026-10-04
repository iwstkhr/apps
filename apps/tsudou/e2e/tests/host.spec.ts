import { createEvent, expect, test } from '../fixtures';

test.describe('主催者', () => {
  test('イベントを作成し、管理用 URL で内容を編集できる', async ({ page, text, newUser }) => {
    const { shareUrl, manageUrl } = await createEvent(page, text, { title: '歓迎会' });
    expect(manageUrl).toContain('#k=');
    expect(shareUrl).not.toContain('#');

    const host = await newUser();
    await host.goto(manageUrl);
    await expect(host.getByRole('heading', { name: text('イベントの管理') })).toBeVisible();

    await host.getByLabel(text('イベント名')).fill('歓迎会（改）');
    await host.getByRole('button', { name: text('変更を保存') }).click();
    await expect(host.getByText(text('保存しました。'))).toBeVisible();

    const guest = await newUser();
    await guest.goto(shareUrl);
    await expect(guest.getByRole('heading', { name: '歓迎会（改）' })).toBeVisible();
  });

  test('管理トークンは URL から消え、再読み込みすると管理用 URL が必要になる', async ({
    page,
    text,
    newUser,
  }) => {
    const { manageUrl } = await createEvent(page, text, { title: '定例会' });

    const host = await newUser();
    await host.goto(manageUrl);
    await expect(host.getByRole('heading', { name: text('イベントの管理') })).toBeVisible();
    expect(host.url()).not.toContain('#k=');

    await host.reload();
    await expect(host.getByRole('heading', { name: text('管理用 URL が必要です') })).toBeVisible();
  });

  test('イベントを削除すると、共有用 URL を開いても見つからない', async ({
    page,
    text,
    newUser,
  }) => {
    const { shareUrl, manageUrl } = await createEvent(page, text, { title: '中止になる会' });

    const host = await newUser();
    await host.goto(manageUrl);
    host.once('dialog', (dialog) => void dialog.accept());
    await host.getByRole('button', { name: text('イベントを削除') }).click();
    await expect(host).toHaveURL('/');

    const guest = await newUser();
    await guest.goto(shareUrl);
    await expect(
      guest.getByRole('heading', { name: text('イベントが見つかりません') }),
    ).toBeVisible();
  });
});
