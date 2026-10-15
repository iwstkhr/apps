// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '~/components/layout/confirm-dialog';

function renderDialog() {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(
    <ConfirmDialog
      title="「洗濯」を完全に削除しますか？"
      details={['この操作は元に戻せません。']}
      confirmLabel="完全に削除"
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  );
  return { user: userEvent.setup(), onConfirm, onClose };
}

describe('ConfirmDialog', () => {
  // Initial focus and Escape are native dialog behavior, so they are checked in E2E
  it('opens as a modal named by the question', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog', { name: '「洗濯」を完全に削除しますか？' });
    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveAccessibleDescription('この操作は元に戻せません。');
  });

  it('confirms with the confirm button', async () => {
    const { user, onConfirm, onClose } = renderDialog();
    await user.click(screen.getByRole('button', { name: '完全に削除' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('cancels with the cancel button', async () => {
    const { user, onConfirm, onClose } = renderDialog();
    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('cancels when the backdrop is clicked, but not from inside', () => {
    const { onConfirm, onClose } = renderDialog();
    const dialog = screen.getByRole('dialog', { name: '「洗濯」を完全に削除しますか？' });

    // Do not cancel when pressed inside and released on the backdrop (e.g. while selecting text)
    fireEvent.pointerDown(screen.getByRole('heading', { name: '「洗濯」を完全に削除しますか？' }));
    fireEvent.click(dialog);
    expect(dialog).toHaveAttribute('open');

    // A click on the backdrop reaches the dialog element itself
    fireEvent.pointerDown(dialog);
    fireEvent.click(dialog);
    expect(dialog).not.toHaveAttribute('open');
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
