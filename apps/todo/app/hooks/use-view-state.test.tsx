// @vitest-environment happy-dom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clampSidebarWidth,
  readViewState,
  SIDEBAR_WIDTH,
  useViewState,
  VIEW_STATE_KEY,
  writeViewState,
} from '~/hooks/use-view-state';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('readViewState / writeViewState', () => {
  it('round-trips the view state', () => {
    writeViewState({ folder: 'f1', collapsed: ['f2'], sidebarWidth: 300, sort: 'custom' });
    expect(readViewState()).toEqual({
      folder: 'f1',
      collapsed: ['f2'],
      sidebarWidth: 300,
      sort: 'custom',
    });
  });

  it('returns null when nothing is saved or the value is broken', () => {
    expect(readViewState()).toBeNull();
    localStorage.setItem(VIEW_STATE_KEY, '{');
    expect(readViewState()).toBeNull();
  });

  it('falls back to defaults for invalid fields', () => {
    localStorage.setItem(
      VIEW_STATE_KEY,
      JSON.stringify({ folder: 1, collapsed: ['a', 2], sidebarWidth: 'wide', sort: 'unknown' }),
    );
    expect(readViewState()).toEqual({
      folder: 'all',
      collapsed: ['a'],
      sidebarWidth: SIDEBAR_WIDTH.default,
      sort: 'due',
    });
  });

  it('reads the state saved before the sidebar width existed', () => {
    localStorage.setItem(VIEW_STATE_KEY, JSON.stringify({ folder: 'f1', collapsed: [] }));
    expect(readViewState()?.sidebarWidth).toBe(SIDEBAR_WIDTH.default);
  });

  it('keeps a saved width within the limits', () => {
    writeViewState({ folder: 'all', collapsed: [], sidebarWidth: 9999 });
    expect(readViewState()?.sidebarWidth).toBe(SIDEBAR_WIDTH.max);
  });

  it('ignores storage errors', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readViewState()).toBeNull();
    expect(() =>
      writeViewState({ folder: 'all', collapsed: [], sidebarWidth: SIDEBAR_WIDTH.default }),
    ).not.toThrow();
  });
});

describe('clampSidebarWidth', () => {
  it('rounds and limits the width', () => {
    expect(clampSidebarWidth(100)).toBe(SIDEBAR_WIDTH.min);
    expect(clampSidebarWidth(250.6)).toBe(251);
    expect(clampSidebarWidth(1000)).toBe(SIDEBAR_WIDTH.max);
  });
});

describe('useViewState', () => {
  it('restores the saved state and saves changes', async () => {
    writeViewState({ folder: 'f1', collapsed: ['f2'], sidebarWidth: 320 });
    const { result } = renderHook(() => useViewState());

    await waitFor(() => expect(result.current.selectedFolder).toBe('f1'));
    expect([...result.current.collapsedFolders]).toEqual(['f2']);
    expect(result.current.sidebarWidth).toBe(320);

    act(() => result.current.setSort('custom'));
    act(() => result.current.setSelectedFolder('unfiled'));
    act(() => result.current.setCollapsedFolders(new Set()));
    act(() => result.current.setSidebarWidth(10_000));
    expect(readViewState()).toEqual({
      folder: 'unfiled',
      collapsed: [],
      sidebarWidth: SIDEBAR_WIDTH.max,
      sort: 'custom',
    });
  });

  it('does not overwrite the saved state with the defaults before restoring', async () => {
    writeViewState({ folder: 'f1', collapsed: [], sidebarWidth: 300 });
    const { result } = renderHook(() => useViewState());
    await waitFor(() => expect(result.current.selectedFolder).toBe('f1'));
    expect(readViewState()).toMatchObject({ folder: 'f1', sidebarWidth: 300 });
  });
});
