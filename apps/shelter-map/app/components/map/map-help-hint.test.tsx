// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MapHelpHint } from '~/components/map/map-help-hint';

describe('MapHelpHint', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('describes map interactions for users', () => {
    render(<MapHelpHint />);

    expect(screen.getByRole('region', { name: '地図の操作方法' })).toBeInTheDocument();
    expect(screen.getByText('地図の操作')).toBeInTheDocument();
    expect(screen.getByText('ドラッグ')).toBeInTheDocument();
    expect(screen.getByText('クリック')).toBeInTheDocument();
    expect(screen.getByText('タップ')).toBeInTheDocument();
    expect(screen.getByText('ピンチ')).toBeInTheDocument();
    expect(screen.getByText('+ スクロール')).toBeInTheDocument();
  });

  it('collapses to a button and remembers the choice', () => {
    const { unmount } = render(<MapHelpHint />);

    fireEvent.click(screen.getByRole('button', { name: '地図の操作方法を閉じる' }));
    expect(screen.queryByRole('region', { name: '地図の操作方法' })).not.toBeInTheDocument();
    expect(window.localStorage.getItem('shelter-map:map-help-open')).toBe('false');
    unmount();

    render(<MapHelpHint />);
    const openButton = screen.getByRole('button', { name: '地図の操作方法を表示' });
    fireEvent.click(openButton);
    expect(screen.getByRole('region', { name: '地図の操作方法' })).toBeInTheDocument();
  });
});
