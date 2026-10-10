import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { THEME_COLORS, THEME_KEY } from '../lib/theme';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('tsudou:language', 'ja');
    delete document.documentElement.dataset.theme;
  });

  it('defaults to the system preference', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'システム設定に合わせる' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // jsdom has no matchMedia, so the system falls back to light
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('applies and remembers an explicit choice', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: 'ダークテーマ' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(screen.getByRole('button', { name: 'ダークテーマ' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'システム設定に合わせる' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });

  it('restores the saved choice', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});

describe('ThemeToggle theme-color', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('tsudou:language', 'ja');
    document.head.innerHTML = '<meta name="theme-color" content="#ffffff" />';
  });

  it('keeps the browser UI color in sync with the theme', async () => {
    const user = userEvent.setup();
    const meta = document.querySelector('meta[name="theme-color"]')!;
    render(<ThemeToggle />);
    expect(meta).toHaveAttribute('content', THEME_COLORS.light);

    await user.click(screen.getByRole('button', { name: 'ダークテーマ' }));
    expect(meta).toHaveAttribute('content', THEME_COLORS.dark);
  });
});
