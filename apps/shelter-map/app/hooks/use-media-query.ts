import { useCallback, useSyncExternalStore } from 'react';

/** Matches Tailwind's `sm` breakpoint. */
export const DESKTOP_MEDIA_QUERY = '(min-width: 40rem)';

export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener('change', onChange);
      return () => mediaQueryList.removeEventListener('change', onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}
