// @vitest-environment happy-dom

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedCallback } from '~/hooks/use-debounced-callback'

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls the callback after the delay', () => {
    const callback = vi.fn()
    renderHook(({ value }) => useDebouncedCallback(value, callback, 200), {
      initialProps: { value: 'initial' },
    })

    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith('initial')
  })

  it('debounces rapid value changes', () => {
    const callback = vi.fn()
    const { rerender } = renderHook(({ value }) => useDebouncedCallback(value, callback, 200), {
      initialProps: { value: 'first' },
    })

    rerender({ value: 'second' })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith('second')
  })
})
