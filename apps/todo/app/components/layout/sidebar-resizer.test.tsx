// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SidebarResizer } from '~/components/layout/sidebar-resizer';

function renderResizer(width = 240) {
  const onChange = vi.fn();
  render(
    <SidebarResizer
      width={width}
      min={180}
      max={480}
      defaultWidth={240}
      onChange={onChange}
      controls="sidebar"
    />,
  );
  return { onChange, handle: screen.getByRole('separator', { name: 'フォルダ欄の幅' }) };
}

describe('SidebarResizer', () => {
  it('describes the current width for assistive technology', () => {
    const { handle } = renderResizer(300);
    expect(handle).toHaveAttribute('aria-valuenow', '300');
    expect(handle).toHaveAttribute('aria-valuemin', '180');
    expect(handle).toHaveAttribute('aria-valuemax', '480');
    expect(handle).toHaveAttribute('aria-controls', 'sidebar');
  });

  it('resizes with the keyboard', async () => {
    const user = userEvent.setup();
    const { onChange, handle } = renderResizer(240);
    handle.focus();

    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith(256);
    await user.keyboard('{Shift>}{ArrowLeft}{/Shift}');
    expect(onChange).toHaveBeenLastCalledWith(176);
    await user.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith(180);
    await user.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith(480);
  });

  it('resizes by dragging and resets on double click', () => {
    const { onChange, handle } = renderResizer(240);
    handle.setPointerCapture = vi.fn();
    handle.releasePointerCapture = vi.fn();

    fireEvent.pointerDown(handle, { button: 0, clientX: 100, pointerId: 1 });
    expect(document.body).toHaveClass('cursor-col-resize');
    fireEvent.pointerMove(handle, { clientX: 160, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith(300);
    fireEvent.pointerUp(handle, { clientX: 160, pointerId: 1 });
    expect(document.body).not.toHaveClass('cursor-col-resize');

    // 離した後は動かしても変わらない
    onChange.mockClear();
    fireEvent.pointerMove(handle, { clientX: 400, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.doubleClick(handle);
    expect(onChange).toHaveBeenLastCalledWith(240);
  });
});
