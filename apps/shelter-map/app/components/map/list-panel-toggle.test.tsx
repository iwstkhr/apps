// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ListPanelToggle } from '~/components/map/list-panel-toggle';

describe('ListPanelToggle', () => {
  it('labels the action by state and reports toggles', () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <ListPanelToggle expanded controls="list-panel" onToggle={onToggle} />,
    );

    const hide = screen.getByRole('button', { name: '一覧を隠す' });
    expect(hide).toHaveAttribute('aria-expanded', 'true');
    expect(hide).toHaveAttribute('aria-controls', 'list-panel');
    fireEvent.click(hide);
    expect(onToggle).toHaveBeenCalledOnce();

    rerender(<ListPanelToggle expanded={false} controls="list-panel" onToggle={onToggle} />);
    expect(screen.getByRole('button', { name: '一覧を表示' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
