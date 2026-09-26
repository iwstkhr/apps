// @vitest-environment happy-dom

import { act, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useShelterTableFilters } from '~/components/table/use-shelter-table-filters';
import { emptyShelterColumnFilters } from '~/types/shelter-filters';

describe('useShelterTableFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces draft filter updates', () => {
    const updateColumnFilters = vi.fn();
    const { result } = renderHook(() => useShelterTableFilters(updateColumnFilters));

    act(() => {
      result.current.setDraftFilters({ ...emptyShelterColumnFilters, name: '横浜' });
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(updateColumnFilters).toHaveBeenCalledOnce();
    expect(updateColumnFilters).toHaveBeenCalledWith({
      ...emptyShelterColumnFilters,
      name: '横浜',
    });
  });

  it('toggles a filter and closes it on an outside pointer event', () => {
    const { result } = renderHook(() => useShelterTableFilters(vi.fn()));

    act(() => result.current.toggleFilterColumn('address'));
    expect(result.current.openFilterColumn).toBe('address');

    act(() => fireEvent.pointerDown(document.body));
    expect(result.current.openFilterColumn).toBeNull();
  });
});
