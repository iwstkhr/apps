/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { beforeEach, describe, expect, it } from 'vitest';
import { PALETTE_KEY, readThemePalette, THEME_PRESETS } from './theme-presets';

const html = readFileSync('index.html', 'utf8');
const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!bootstrap) throw new Error('Missing theme bootstrap');

function boot(prefersDark: boolean) {
  runInNewContext(bootstrap!, {
    document,
    localStorage,
    navigator: { languages: ['en'] },
    window: { matchMedia: () => ({ matches: prefersDark }) },
  });
}

describe('theme before first paint', () => {
  beforeEach(() => {
    localStorage.clear();
    document.head.innerHTML = '<meta name="theme-color" content="#ffffff" />';
  });

  it.each(THEME_PRESETS)('restores $id with the same colors as React', (preset) => {
    localStorage.setItem(PALETTE_KEY, preset.id);
    for (const dark of [false, true]) {
      boot(dark);
      expect(document.documentElement.dataset.palette).toBe(preset.id);
      expect(document.documentElement.dataset.theme).toBe(dark ? 'dark' : 'light');
      expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
        'content',
        preset[dark ? 'dark' : 'light'],
      );
    }
  });

  it.each(['unknown', 'toString', '__proto__'])('rejects invalid saved value %s', (value) => {
    localStorage.setItem(PALETTE_KEY, value);
    boot(false);
    expect(document.documentElement.dataset.palette).toBe('default');
    expect(readThemePalette()).toBe('default');
  });
});
