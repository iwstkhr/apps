import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { type Confirm, useConfirm } from '../lib/confirm';
import { setLanguage } from '../lib/i18n';
import { ConfirmProvider } from './confirm-dialog';

const options = { message: '削除します。よろしいですか?', confirmLabel: '削除' };

function renderConfirm() {
  let confirm!: Confirm;
  function Capture() {
    confirm = useConfirm();
    return <button type="button">開く</button>;
  }
  render(
    <ConfirmProvider>
      <Capture />
    </ConfirmProvider>,
  );
  return () => confirm;
}

/** Start a confirmation, act on the dialog, and return the result */
async function settle(confirm: Confirm, operate: (dialog: HTMLElement) => void) {
  let pending!: Promise<boolean>;
  act(() => {
    pending = confirm(options);
  });
  const dialog = await screen.findByRole('dialog', { name: options.message });
  let result!: boolean;
  await act(async () => {
    operate(dialog);
    result = await pending;
  });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  return result;
}

describe('ConfirmProvider', () => {
  beforeEach(() => setLanguage('ja'));

  it('開いたときはキャンセルにフォーカスし、閉じたら元の要素に戻す', async () => {
    const confirm = renderConfirm();
    const opener = screen.getByRole('button', { name: '開く' });
    opener.focus();

    act(() => {
      void confirm()(options);
    });
    const dialog = await screen.findByRole('dialog', { name: options.message });
    expect(within(dialog).getByRole('button', { name: 'キャンセル' })).toHaveFocus();

    fireEvent.click(within(dialog).getByRole('button', { name: 'キャンセル' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('実行ボタンで true、キャンセルで false を返す', async () => {
    const confirm = renderConfirm();
    expect(
      await settle(confirm(), (d) =>
        fireEvent.click(within(d).getByRole('button', { name: '削除' })),
      ),
    ).toBe(true);
    expect(
      await settle(confirm(), (d) =>
        fireEvent.click(within(d).getByRole('button', { name: 'キャンセル' })),
      ),
    ).toBe(false);
  });

  it('Esc (cancel イベント) と背景のクリックはキャンセル扱いにする', async () => {
    const confirm = renderConfirm();
    expect(
      await settle(confirm(), (d) => fireEvent(d, new Event('cancel', { cancelable: true }))),
    ).toBe(false);
    expect(await settle(confirm(), (d) => fireEvent.click(d))).toBe(false);
  });

  it('表示中に次の確認が来たら、前の確認は false で終わらせる', async () => {
    const confirm = renderConfirm();
    let first!: Promise<boolean>;
    act(() => {
      first = confirm()(options);
    });
    await screen.findByRole('dialog');
    expect(
      await settle(confirm(), (d) =>
        fireEvent.click(within(d).getByRole('button', { name: '削除' })),
      ),
    ).toBe(true);
    expect(await first).toBe(false);
  });
});
