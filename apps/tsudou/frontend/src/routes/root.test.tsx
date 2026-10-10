import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Root } from './root';

function renderRoot() {
  const router = createMemoryRouter([{ path: '/', element: <Root /> }]);
  render(<RouterProvider router={router} />);
}

describe('Root', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('フッターの著作権表記は表示した時点の年になる', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2031-06-01T00:00:00'));
    renderRoot();

    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      '© 2031 wasabee.dev. All Rights Reserved.',
    );
  });

  it('ヘッダーから使い方ページへ移動できる', () => {
    renderRoot();

    expect(screen.getByRole('link', { name: '使い方' })).toHaveAttribute('href', '/guide');
  });

  it('ヘッダーのアプリ名の横にアイコンを表示し、リンク名はアプリ名のままにする', () => {
    renderRoot();

    const home = screen.getByRole('link', { name: /^Tsudou/ });
    expect(home).toHaveAttribute('href', '/');
    expect(home.querySelector('img[src="/favicon.svg"]')).toHaveAttribute('alt', '');
  });
});

// These assertions verify the Japanese interface explicitly.
beforeEach(() => localStorage.setItem('tsudou:language', 'ja'));
