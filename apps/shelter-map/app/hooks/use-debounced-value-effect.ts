import { useEffect } from 'react';

export function useDebouncedValueEffect<T>(value: T, effect: (value: T) => void, delayMs: number) {
  useEffect(() => {
    const timer = window.setTimeout(() => effect(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, effect, delayMs]);
}
