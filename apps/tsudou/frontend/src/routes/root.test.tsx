import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('ヘッダーから使い方ページへ移動できる', async () => {
    renderRoot();
    await userEvent.setup().click(screen.getByRole('button', { name: 'メニュー' }));

    expect(screen.getByRole('link', { name: '使い方' })).toHaveAttribute('href', '/guide');
  });

  it('メニューにトップへの重複リンクを表示せず開閉できる', async () => {
    const user = userEvent.setup();
    renderRoot();
    const menu = screen.getByRole('button', { name: 'メニュー' });
    expect(screen.queryByRole('link', { name: '新しく作る' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '日本語' })).not.toBeInTheDocument();
    await user.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('link', { name: '新しく作る' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Tsudou/ })).toHaveAttribute('href', '/');
    await user.tab();
    await user.keyboard('{Escape}');
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveFocus();
    await user.click(menu);
    await user.click(screen.getByRole('contentinfo'));
    expect(menu).toHaveAttribute('aria-expanded', 'false');
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
