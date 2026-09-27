// @vitest-environment happy-dom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValueEffect } from '~/hooks/use-debounced-value-effect';

describe('useDebouncedValueEffect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls the effect after the delay', () => {
    const effect = vi.fn();
    renderHook(({ value }) => useDebouncedValueEffect(value, effect, 200), {
      initialProps: { value: 'initial' },
    });

    expect(effect).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(effect).toHaveBeenCalledOnce();
    expect(effect).toHaveBeenCalledWith('initial');
  });

  it('debounces rapid value changes', () => {
    const effect = vi.fn();
    const { rerender } = renderHook(({ value }) => useDebouncedValueEffect(value, effect, 200), {
      initialProps: { value: 'first' },
    });

    rerender({ value: 'second' });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(effect).toHaveBeenCalledOnce();
    expect(effect).toHaveBeenCalledWith('second');
  });
});
