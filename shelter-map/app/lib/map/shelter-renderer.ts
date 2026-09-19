import { L } from '~/lib/leaflet';
import {
  SHELTER_CIRCLE_STYLE,
  SHELTER_MARKER_LIMIT_BELOW_MIN_ZOOM,
  SHELTER_MARKER_MIN_ZOOM,
  SHELTER_POPUP_OPTIONS,
} from '~/lib/map/constants';
import { getPopupContent } from '~/lib/map/shelter-popup';
import type { Shelter } from '~/types/shelter';

function replaceShelterLayers(
  group: L.LayerGroup,
  shelters: Shelter[],
  createLayer: (latLng: L.LatLngTuple) => L.Layer,
): void {
  group.clearLayers();
  for (const shelter of shelters) {
    createLayer([shelter.latitude, shelter.longitude])
      .bindPopup(getPopupContent(shelter), SHELTER_POPUP_OPTIONS)
      .addTo(group);
  }
}

export function renderShelterCircles(group: L.LayerGroup, shelters: Shelter[]): void {
  replaceShelterLayers(group, shelters, (latLng) => L.circle(latLng, SHELTER_CIRCLE_STYLE));
}

export function shouldRenderShelterMarkers(zoom: number, count: number): boolean {
  return zoom >= SHELTER_MARKER_MIN_ZOOM || count <= SHELTER_MARKER_LIMIT_BELOW_MIN_ZOOM;
}

export function renderShelterMarkers(group: L.LayerGroup, shelters: Shelter[], zoom: number): void {
  const visible = shouldRenderShelterMarkers(zoom, shelters.length) ? shelters : [];
  replaceShelterLayers(group, visible, (latLng) => L.marker(latLng));
}
