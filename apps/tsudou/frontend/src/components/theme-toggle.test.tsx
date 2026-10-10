import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_COLORS, THEME_KEY } from '../lib/theme';
import { PALETTE_KEY, THEME_PRESETS } from '../lib/theme-presets';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('tsudou:language', 'ja');
    delete document.documentElement.dataset.theme;
  });

  it('defaults to the system preference', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    expect(screen.queryByRole('button', { name: 'ダーク' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'テーマを選択' }));
    expect(screen.getByRole('button', { name: '自動' })).toHaveAttribute('aria-pressed', 'true');
    // jsdom has no matchMedia, so the system falls back to light
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('applies and remembers an explicit choice', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: 'テーマを選択' }));
    await user.click(screen.getByRole('button', { name: 'ダーク' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(screen.getByRole('button', { name: 'ダーク' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: '自動' }));
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

    await user.click(screen.getByRole('button', { name: 'テーマを選択' }));
    await user.click(screen.getByRole('button', { name: 'ダーク' }));
    expect(meta).toHaveAttribute('content', THEME_COLORS.dark);
  });
});

describe('ThemeToggle palettes', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('tsudou:language', 'ja');
    document.head.innerHTML = '<meta name="theme-color" content="#ffffff" />';
  });

  afterEach(() => vi.restoreAllMocks());

  it.each(THEME_PRESETS)(
    'applies $id in either mode and restores it after remount',
    async (preset) => {
      const user = userEvent.setup();
      const view = render(<ThemeToggle />);
      await user.click(screen.getByRole('button', { name: 'テーマを選択' }));
      await user.click(screen.getByRole('radio', { name: preset.label }));
      expect(document.documentElement.dataset.palette).toBe(preset.id);
      expect(document.documentElement.dataset.theme).toBe('light');
      expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
        'content',
        preset.light,
      );
      expect(localStorage.getItem(PALETTE_KEY)).toBe(preset.id === 'default' ? null : preset.id);

      await user.click(screen.getByRole('button', { name: '閉じる' }));
      expect(screen.getByRole('button', { name: 'テーマを選択' })).toHaveFocus();
      await user.click(screen.getByRole('button', { name: 'テーマを選択' }));
      await user.click(screen.getByRole('button', { name: 'ダーク' }));
      expect(document.documentElement.dataset.palette).toBe(preset.id);
      expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
        'content',
        preset.dark,
      );
      view.unmount();
      render(<ThemeToggle />);
      expect(document.documentElement.dataset.palette).toBe(preset.id);
      expect(document.documentElement.dataset.theme).toBe('dark');
    },
  );

  it('falls back for an unknown saved palette and clears a previous preset on reset', async () => {
    const user = userEvent.setup();
    localStorage.setItem(PALETTE_KEY, 'unknown');
    render(<ThemeToggle />);
    expect(document.documentElement.dataset.palette).toBe('default');
    await user.click(screen.getByRole('button', { name: 'テーマを選択' }));
    await user.click(screen.getByRole('radio', { name: 'ミント' }));
    await user.click(screen.getByRole('radio', { name: 'インディゴ' }));
    expect(localStorage.getItem(PALETTE_KEY)).toBeNull();
    expect(document.documentElement.dataset.palette).toBe('default');
  });

  it('still applies colors when storage is unavailable', async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('unavailable');
    });
    render(<ThemeToggle />);
    await user.click(screen.getByRole('button', { name: 'テーマを選択' }));
    await user.click(screen.getByRole('radio', { name: 'オーシャン' }));
    expect(document.documentElement.dataset.palette).toBe('ocean');
    expect(screen.getByRole('radio', { name: 'オーシャン' })).toBeChecked();
  });

  it('keeps the palette while following OS mode changes', async () => {
    let listener: ((event: { matches: boolean }) => void) | undefined;
    const remove = vi.fn();
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: (_: string, callback: typeof listener) => {
        listener = callback;
      },
      removeEventListener: remove,
    }));
    try {
      localStorage.setItem(PALETTE_KEY, 'aubergine');
      const view = render(<ThemeToggle />);
      listener?.({ matches: true });
      expect(document.documentElement.dataset.theme).toBe('dark');
      expect(document.documentElement.dataset.palette).toBe('aubergine');
      expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
        'content',
        '#29182e',
      );
      view.unmount();
      expect(remove).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
