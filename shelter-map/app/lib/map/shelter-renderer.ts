import { L } from '~/lib/leaflet';
import { SHELTER_CIRCLE_STYLE, SHELTER_POPUP_OPTIONS } from '~/lib/map/constants';
import { getPopupContent } from '~/lib/map/shelter-popup';
import type { Shelter } from '~/types/shelter';

export function clearShelterCircles(circles: L.Circle[]): void {
  circles.forEach((circle) => {
    circle.remove();
  });
}

export function clearShelterMarkers(markers: L.Marker[]): void {
  markers.forEach((marker) => {
    marker.remove();
  });
}

export function addShelterCircles(map: L.Map, shelters: Shelter[]): L.Circle[] {
  return shelters.map((shelter) =>
    L.circle([shelter.latitude, shelter.longitude], SHELTER_CIRCLE_STYLE)
      .bindPopup(getPopupContent(shelter), SHELTER_POPUP_OPTIONS)
      .addTo(map),
  );
}

export function addShelterMarkers(map: L.Map, shelters: Shelter[]): L.Marker[] {
  if ((map.getZoom() ?? 0) < 15 && shelters.length > 100) {
    return [];
  }

  return shelters.map((shelter) =>
    L.marker([shelter.latitude, shelter.longitude])
      .bindPopup(getPopupContent(shelter), SHELTER_POPUP_OPTIONS)
      .addTo(map),
  );
}

export function renderShelterCircles(
  map: L.Map,
  shelters: Shelter[],
  existingCircles: L.Circle[],
): L.Circle[] {
  clearShelterCircles(existingCircles);
  return addShelterCircles(map, shelters);
}

export function renderShelterMarkers(
  map: L.Map,
  shelters: Shelter[],
  existingMarkers: L.Marker[],
): L.Marker[] {
  clearShelterMarkers(existingMarkers);
  return addShelterMarkers(map, shelters);
}
