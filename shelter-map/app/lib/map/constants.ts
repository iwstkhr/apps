import type { LatLngExpression, PopupOptions } from 'leaflet';

export const MAP_CENTER: LatLngExpression = [35.4122, 139.413];
export const INITIAL_ZOOM = 8;

export const SHELTER_POPUP_OPTIONS: PopupOptions = {
  className: 'shelter-popup',
  autoPan: true,
  autoPanPadding: [20, 20],
  keepInView: true,
};

export const SHELTER_CIRCLE_STYLE = {
  radius: 20,
  color: '#1e40af',
  fillColor: '#3b82f6',
  fillOpacity: 0.8,
  weight: 2,
} as const;
