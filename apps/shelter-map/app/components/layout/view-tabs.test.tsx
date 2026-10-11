// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ViewTabs } from '~/components/layout/view-tabs';

describe('ViewTabs', () => {
  it('marks the current view and reports tab changes with the list count', () => {
    const onChange = vi.fn();
    render(<ViewTabs view="map" listCount={1234} onChange={onChange} />);

    expect(screen.getByRole('tab', { name: '地図' })).toHaveAttribute('aria-selected', 'true');
    const listTab = screen.getByRole('tab', { name: /一覧/ });
    expect(listTab).toHaveAttribute('aria-selected', 'false');
    expect(listTab).toHaveTextContent('(1,234)');

    fireEvent.click(listTab);
    expect(onChange).toHaveBeenCalledWith('list');
  });
});
