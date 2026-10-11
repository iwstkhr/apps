// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StatusTabs } from '~/components/todo/status-tabs';

const counts = { all: 5, todo: 2, in_progress: 1, on_hold: 1, done: 1 };

describe('StatusTabs', () => {
  it('shows a colored icon with a distinct shape before each status', () => {
    render(<StatusTabs value="all" counts={counts} onChange={() => {}} />);
    const icon = (name: RegExp) =>
      screen.getByRole('button', { name }).querySelector('svg[data-status]');

    expect(icon(/^すべて/)).not.toHaveAttribute('style');
    expect(icon(/^未着手/)).toHaveStyle({ color: '#7a889c' });
    expect(icon(/^進行中/)).toHaveStyle({ color: '#3b82f6' });
    expect(icon(/^保留/)).toHaveStyle({ color: '#a855f7' });
    expect(icon(/^完了/)).toHaveStyle({ color: '#059669' });

    // Statuses are also distinguishable by shape (every icon differs)
    const shapes = [/^すべて/, /^未着手/, /^進行中/, /^保留/, /^完了/].map((name) =>
      screen.getByRole('button', { name }).querySelector('svg path')?.getAttribute('d'),
    );
    expect(new Set(shapes).size).toBe(5);
  });

  it('keeps the icons out of the accessible name', async () => {
    const onChange = vi.fn();
    render(<StatusTabs value="all" counts={counts} onChange={onChange} />);
    for (const svg of document.querySelectorAll('svg[data-status]')) {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    }
    await userEvent.setup().click(screen.getByRole('button', { name: '進行中 1' }));
    expect(onChange).toHaveBeenCalledWith('in_progress');
  });

  it('fades the side with hidden tabs and shows an arrow there', () => {
    const { container } = render(<StatusTabs value="all" counts={counts} onChange={() => {}} />);
    const scroller = container.querySelector('fieldset > div') as HTMLDivElement;
    const shown = () =>
      [...container.querySelectorAll('[data-scroll-hint]')]
        .filter((hint) => !hint.classList.contains('opacity-0'))
        .map((hint) => hint.getAttribute('data-scroll-hint'));
    expect(shown()).toEqual([]);

    // Make the tabs wider than the track
    Object.defineProperty(scroller, 'scrollWidth', { configurable: true, value: 600 });
    Object.defineProperty(scroller, 'clientWidth', { configurable: true, value: 300 });
    fireEvent.scroll(scroller);
    expect(shown()).toEqual(['end']);

    // In the middle, both sides fade
    scroller.scrollLeft = 150;
    fireEvent.scroll(scroller);
    expect(shown()).toEqual(['start', 'end']);

    // At the end, only the left side fades
    scroller.scrollLeft = 300;
    fireEvent.scroll(scroller);
    expect(shown()).toEqual(['start']);
  });

  it('does not change the scroller while it scrolls, which would stop touch scrolling', () => {
    const { container } = render(<StatusTabs value="all" counts={counts} onChange={() => {}} />);
    const scroller = container.querySelector('fieldset > div') as HTMLDivElement;
    const before = { style: scroller.getAttribute('style'), children: scroller.children.length };
    const hints = [...container.querySelectorAll('[data-scroll-hint]')];

    Object.defineProperty(scroller, 'scrollWidth', { configurable: true, value: 600 });
    Object.defineProperty(scroller, 'clientWidth', { configurable: true, value: 300 });
    scroller.scrollLeft = 150;
    fireEvent.scroll(scroller);

    expect(scroller.getAttribute('style')).toBe(before.style);
    expect(scroller.children).toHaveLength(before.children);
    // The hints are the same elements, only shown
    expect([...container.querySelectorAll('[data-scroll-hint]')]).toEqual(hints);
  });
});
