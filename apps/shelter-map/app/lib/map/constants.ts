import type { CircleMarkerOptions, LatLngExpression, PopupOptions } from 'leaflet';

export const MAP_CENTER: LatLngExpression = [35.4122, 139.413];
export const INITIAL_ZOOM = 8;

export const SHELTER_POPUP_OPTIONS: PopupOptions = {
  className: 'shelter-popup',
  autoPan: true,
  autoPanPadding: [20, 20],
  keepInView: true,
};

/**
 * default: no disaster type is selected
 * match: designated for every selected disaster type
 * dim: misses a selected type (shown only when non-matching shelters are kept)
 */
export type ShelterLayerStyle = 'default' | 'match' | 'dim';

export const SHELTER_CIRCLE_STYLES = {
  default: { radius: 6, color: '#1e40af', fillColor: '#3b82f6', fillOpacity: 0.85, weight: 1.5 },
  match: { radius: 7, color: '#047857', fillColor: '#10b981', fillOpacity: 0.9, weight: 2 },
  dim: { radius: 4, color: '#64748b', fillColor: '#cbd5e1', fillOpacity: 0.7, weight: 1 },
} as const satisfies Record<ShelterLayerStyle, CircleMarkerOptions>;

// Matching pins are drawn above dimmed ones where they overlap.
export const SHELTER_MARKER_Z_INDEX_OFFSETS: Record<ShelterLayerStyle, number> = {
  default: 0,
  match: 1000,
  dim: -1000,
};

// Below this zoom, markers are drawn only when few shelters are in view to keep panning responsive.
export const SHELTER_MARKER_MIN_ZOOM = 15;
export const SHELTER_MARKER_LIMIT_BELOW_MIN_ZOOM = 100;
