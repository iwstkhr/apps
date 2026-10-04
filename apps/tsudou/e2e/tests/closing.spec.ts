import { createEvent, expect, test } from '../fixtures';

test('締め切ると参加者は回答できず、受付を再開すると回答できる', async ({
  page,
  text,
  newUser,
}) => {
  const { shareUrl, manageUrl } = await createEvent(page, text, { title: '歓迎会' });

  const host = await newUser();
  await host.goto(manageUrl);
  await host.getByRole('button', { name: text('回答を締め切る') }).click();
  await expect(host.getByText(text('締切中です。参加者は回答できません。'))).toBeVisible();

  const guest = await newUser();
  await guest.goto(shareUrl);
  await expect(
    guest.getByText(text('このイベントは締め切られているため、回答できません。')),
  ).toBeVisible();
  await expect(guest.getByLabel(text('お名前'))).toHaveCount(0);

  await host.getByRole('button', { name: text('受付を再開する') }).click();
  await expect(host.getByRole('button', { name: text('回答を締め切る') })).toBeVisible();

  await guest.reload();
  await expect(guest.getByLabel(text('お名前'))).toBeVisible();
});
