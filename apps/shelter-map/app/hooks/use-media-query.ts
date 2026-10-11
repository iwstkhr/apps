import { useCallback, useSyncExternalStore } from 'react';

/** Tailwind's `sm` breakpoint: wider than phones, so the map and the list fit together. */
export const SM_MEDIA_QUERY = '(min-width: 40rem)';
/** Tailwind's `lg` breakpoint: wide enough to show the list beside the map. */
export const LG_MEDIA_QUERY = '(min-width: 64rem)';

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
