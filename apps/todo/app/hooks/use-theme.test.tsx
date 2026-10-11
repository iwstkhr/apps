// @vitest-environment happy-dom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { APPEARANCE_KEY, DEFAULT_THEME, THEME_KEY, THEMES } from '~/lib/themes';
import { useTheme } from './use-theme';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.mode;
});

describe('useTheme', () => {
  it('restores and saves the display mode separately from the palette', () => {
    localStorage.setItem(APPEARANCE_KEY, 'dark');
    localStorage.setItem(THEME_KEY, 'ocean');
    const { result } = renderHook(useTheme);
    expect(document.documentElement.dataset.mode).toBe('dark');
    act(() => result.current.setAppearance('light'));
    expect(document.documentElement.dataset.mode).toBe('light');
    expect(localStorage.getItem(APPEARANCE_KEY)).toBe('light');
    expect(result.current.theme).toBe('ocean');
  });
  it('restores the saved preset and applies and saves a new selection', async () => {
    localStorage.setItem(THEME_KEY, 'mint');
    const { result } = renderHook(useTheme);
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('mint'));
    expect(localStorage.getItem(THEME_KEY)).toBe('mint');
    act(() => result.current.setTheme('ocean'));
    expect(document.documentElement.dataset.theme).toBe('ocean');
    expect(localStorage.getItem(THEME_KEY)).toBe('ocean');
  });

  it('uses the default preset for missing or invalid preferences', () => {
    const first = renderHook(useTheme);
    expect(first.result.current.theme).toBe('indigo');
    first.unmount();
    localStorage.setItem(THEME_KEY, 'unknown');
    localStorage.setItem(APPEARANCE_KEY, 'unknown');
    const second = renderHook(useTheme);
    expect(second.result.current.theme).toBe('indigo');
    expect(second.result.current.appearance).toBe('system');
    expect(document.documentElement.dataset.theme).toBe('indigo');
  });

  it('falls back to the default for presets that no longer exist', () => {
    localStorage.setItem(THEME_KEY, 'forest');
    const { result } = renderHook(useTheme);
    expect(result.current.theme).toBe('indigo');
  });

  it('offers the six presets with インディゴ first as the default', () => {
    expect(THEMES.map((theme) => theme.label)).toEqual([
      'インディゴ',
      'オーベルジーヌ',
      'オーシャン',
      'ミント',
      'サンセット',
      'グラファイト',
    ]);
    expect(DEFAULT_THEME).toBe('indigo');
  });

  it('keeps selection usable when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(useTheme);
    act(() => result.current.setTheme('graphite'));
    act(() => result.current.setAppearance('dark'));
    expect(document.documentElement.dataset.theme).toBe('graphite');
    expect(document.documentElement.dataset.mode).toBe('dark');
  });
});
