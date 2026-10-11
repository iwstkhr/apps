// @vitest-environment happy-dom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from '~/hooks/use-debounced-value';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the latest value only after the delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), {
      initialProps: { value: '' },
    });

    rerender({ value: '横' });
    rerender({ value: '横浜' });
    expect(result.current).toBe('');

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('横浜');
  });
});
