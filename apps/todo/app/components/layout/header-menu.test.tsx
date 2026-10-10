// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { HeaderMenu } from '~/components/layout/header-menu';
import { getLanguage, setLanguage } from '~/lib/i18n';

beforeAll(() => {
  // happy-dom の dialog は showModal を持たないことがあるので用意する
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
});

afterEach(() => {
  localStorage.clear();
});

function renderMenu({ exportDisabled = false } = {}) {
  const onExport = vi.fn();
  const onImport = vi.fn();
  const user = userEvent.setup();
  render(
    <>
      <HeaderMenu onExport={onExport} exportDisabled={exportDisabled} onImport={onImport} />
      <button type="button">ページの次の要素</button>
    </>,
  );
  const button = screen.getByRole('button', { name: 'メニュー' });
  return { user, button, onExport, onImport };
}

describe('HeaderMenu', () => {
  it('opens a menu with language, theme, export, and import, focusing the first item', async () => {
    const { user, button } = renderMenu();
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu', { name: 'メニュー' });
    expect(button).toHaveAttribute('aria-controls', menu.id);
    expect(screen.getByRole('group', { name: '言語' })).toBeInTheDocument();
    expect(screen.getAllByRole('menuitemradio').map((item) => item.textContent)).toEqual([
      'English',
      '日本語',
    ]);
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'テーマ…',
      'エクスポート',
      'インポート',
    ]);
    // 最初の項目 (English) にフォーカスし、今の言語 (日本語) に印が付く
    expect(screen.getByRole('menuitemradio', { name: 'English' })).toHaveFocus();
    expect(screen.getByRole('menuitemradio', { name: '日本語' })).toBeChecked();
  });

  it('moves with the arrow keys, Home, and End, and wraps around', async () => {
    const { user, button } = renderMenu();
    button.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: 'English' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: '日本語' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: 'インポート' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: 'English' })).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'インポート' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('menuitemradio', { name: 'English' })).toHaveFocus();
  });

  it('closes with Escape and returns focus to the button', async () => {
    const { user, button } = renderMenu();
    await user.click(button);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('closes when focus leaves with Tab or a click lands outside', async () => {
    const { user, button } = renderMenu();
    await user.click(button);
    await user.tab();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(button);
    await user.click(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('switches the language and closes', async () => {
    const { user, button } = renderMenu();
    await user.click(button);
    await user.click(screen.getByRole('menuitemradio', { name: 'English' }));
    expect(getLanguage()).toBe('en');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveFocus();
    setLanguage('ja');
  });

  it('opens the theme dialog', async () => {
    const { user, button } = renderMenu();
    await user.click(button);
    await user.click(screen.getByRole('menuitem', { name: 'テーマ…' }));
    expect(screen.getByRole('dialog', { name: 'テーマ' })).toHaveAttribute('open');
  });

  it('runs export and import, and ignores a disabled export', async () => {
    const enabled = renderMenu();
    await enabled.user.click(enabled.button);
    await enabled.user.click(screen.getByRole('menuitem', { name: 'エクスポート' }));
    expect(enabled.onExport).toHaveBeenCalledTimes(1);
    await enabled.user.click(enabled.button);
    await enabled.user.click(screen.getByRole('menuitem', { name: 'インポート' }));
    expect(enabled.onImport).toHaveBeenCalledTimes(1);
  });

  it('keeps a disabled export focusable but does nothing', async () => {
    const { user, button, onExport } = renderMenu({ exportDisabled: true });
    await user.click(button);
    const item = screen.getByRole('menuitem', { name: 'エクスポート' });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    await user.click(item);
    expect(onExport).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});
