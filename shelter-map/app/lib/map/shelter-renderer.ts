import { L } from '~/lib/leaflet';
import {
  SHELTER_CIRCLE_STYLE,
  SHELTER_MARKER_LIMIT_BELOW_MIN_ZOOM,
  SHELTER_MARKER_MIN_ZOOM,
  SHELTER_POPUP_OPTIONS,
} from '~/lib/map/constants';
import { getPopupContent } from '~/lib/map/shelter-popup';
import type { Shelter } from '~/types/shelter';

type ShelterLayerKind = 'circle' | 'marker';

interface ShelterLayerEntry {
  kind: ShelterLayerKind;
  layer: L.Layer;
}

export type ShelterLayerRegistry = Map<Shelter, ShelterLayerEntry>;

export function createShelterLayerRegistry(): ShelterLayerRegistry {
  return new Map();
}

export function shouldRenderShelterMarkers(zoom: number, count: number): boolean {
  return zoom >= SHELTER_MARKER_MIN_ZOOM || count <= SHELTER_MARKER_LIMIT_BELOW_MIN_ZOOM;
}

function createShelterLayer(shelter: Shelter, kind: ShelterLayerKind): L.Layer {
  const latLng: L.LatLngTuple = [shelter.latitude, shelter.longitude];
  const layer = kind === 'marker' ? L.marker(latLng) : L.circle(latLng, SHELTER_CIRCLE_STYLE);

  return layer.bindPopup(getPopupContent(shelter), SHELTER_POPUP_OPTIONS);
}

export function syncShelterLayers(
  group: L.LayerGroup,
  registry: ShelterLayerRegistry,
  shelters: Shelter[],
  zoom: number,
): void {
  const kind: ShelterLayerKind = shouldRenderShelterMarkers(zoom, shelters.length)
    ? 'marker'
    : 'circle';
  const nextShelters = new Set(shelters);

  for (const [shelter, entry] of registry) {
    if (nextShelters.has(shelter) && entry.kind === kind) {
      continue;
    }

    group.removeLayer(entry.layer);
    registry.delete(shelter);
  }

  for (const shelter of shelters) {
    if (registry.has(shelter)) {
      continue;
    }

    const layer = createShelterLayer(shelter, kind);
    layer.addTo(group);
    registry.set(shelter, { kind, layer });
  }
}
