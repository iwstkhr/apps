import type { ZoomPanOptions } from 'leaflet';

// Leaflet scales the flight time with the distance, so a far shelter took several seconds.
// A fixed short flight keeps the sense of direction without the wait.
export const MAP_FLY_DURATION_SECONDS = 0.8;

const REDUCED_MOTION_MEDIA_QUERY = '(prefers-reduced-motion: reduce)';

/** Options for `map.flyTo`: a short flight, or an instant jump when the user prefers less motion. */
export function getMapFlyOptions(): ZoomPanOptions {
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_MEDIA_QUERY).matches;
  return { duration: MAP_FLY_DURATION_SECONDS, animate: !prefersReducedMotion };
}
