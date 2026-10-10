// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StatusSidebar } from '~/components/todo/status-sidebar';

const counts = { all: 5, todo: 2, in_progress: 1, on_hold: 1, done: 1 };

describe('StatusSidebar', () => {
  it('shows a colored icon with a distinct shape before each status', () => {
    render(<StatusSidebar value="all" counts={counts} onChange={() => {}} />);
    const icon = (name: RegExp) =>
      screen.getByRole('button', { name }).querySelector('svg[data-status]');

    expect(icon(/^すべて/)).not.toHaveAttribute('style');
    expect(icon(/^未着手/)).toHaveStyle({ color: '#7a889c' });
    expect(icon(/^進行中/)).toHaveStyle({ color: '#3b82f6' });
    expect(icon(/^保留/)).toHaveStyle({ color: '#a855f7' });
    expect(icon(/^完了/)).toHaveStyle({ color: '#059669' });

    // 形でも見分けられる (アイコンが全部違う)
    const shapes = [/^すべて/, /^未着手/, /^進行中/, /^保留/, /^完了/].map((name) =>
      screen.getByRole('button', { name }).querySelector('svg path')?.getAttribute('d'),
    );
    expect(new Set(shapes).size).toBe(5);
  });

  it('keeps the icons out of the accessible name', async () => {
    const onChange = vi.fn();
    render(<StatusSidebar value="all" counts={counts} onChange={onChange} />);
    for (const svg of document.querySelectorAll('svg[data-status]')) {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    }
    await userEvent.setup().click(screen.getByRole('button', { name: '進行中 1' }));
    expect(onChange).toHaveBeenCalledWith('in_progress');
  });
});
