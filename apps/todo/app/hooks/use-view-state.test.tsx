// @vitest-environment happy-dom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  readViewState,
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
    writeViewState({ folder: 'f1', collapsed: ['f2'] });
    expect(readViewState()).toEqual({ folder: 'f1', collapsed: ['f2'] });
  });

  it('returns null when nothing is saved or the value is broken', () => {
    expect(readViewState()).toBeNull();
    localStorage.setItem(VIEW_STATE_KEY, '{');
    expect(readViewState()).toBeNull();
  });

  it('falls back to defaults for invalid fields', () => {
    localStorage.setItem(VIEW_STATE_KEY, JSON.stringify({ folder: 1, collapsed: ['a', 2] }));
    expect(readViewState()).toEqual({ folder: 'all', collapsed: ['a'] });
  });

  it('ignores storage errors', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readViewState()).toBeNull();
    expect(() => writeViewState({ folder: 'all', collapsed: [] })).not.toThrow();
  });
});

describe('useViewState', () => {
  it('restores the saved state and saves changes', async () => {
    writeViewState({ folder: 'f1', collapsed: ['f2'] });
    const { result } = renderHook(() => useViewState());

    await waitFor(() => expect(result.current.selectedFolder).toBe('f1'));
    expect([...result.current.collapsedFolders]).toEqual(['f2']);

    act(() => result.current.setSelectedFolder('unfiled'));
    act(() => result.current.setCollapsedFolders(new Set()));
    expect(readViewState()).toEqual({ folder: 'unfiled', collapsed: [] });
  });

  it('does not overwrite the saved state with the defaults before restoring', async () => {
    writeViewState({ folder: 'f1', collapsed: [] });
    const { result } = renderHook(() => useViewState());
    await waitFor(() => expect(result.current.selectedFolder).toBe('f1'));
    expect(readViewState()?.folder).toBe('f1');
  });
});
