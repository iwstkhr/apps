import { useEffect } from 'react'

export function useDebouncedCallback<T>(value: T, callback: (value: T) => void, delayMs: number) {
  useEffect(() => {
    const timer = window.setTimeout(() => callback(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, callback, delayMs])
}
