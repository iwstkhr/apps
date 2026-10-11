import { L } from '~/lib/leaflet';
import {
  SHELTER_CIRCLE_STYLES,
  SHELTER_MARKER_LIMIT_BELOW_MIN_ZOOM,
  SHELTER_MARKER_MIN_ZOOM,
  SHELTER_MARKER_Z_INDEX_OFFSETS,
  SHELTER_POPUP_OPTIONS,
  type ShelterLayerStyle,
} from '~/lib/map/constants';
import { getPopupContent } from '~/lib/map/shelter-popup';
import type { Shelter } from '~/types/shelter';
import { matchesShelterTypes } from '~/types/shelter-filters';
import type { ShelterTypeKey } from '~/types/shelter-type';

type ShelterLayerKind = 'circle' | 'marker';

interface ShelterLayerEntry {
  kind: ShelterLayerKind;
  style: ShelterLayerStyle;
  layer: L.Layer;
}

export type ShelterLayerRegistry = Map<Shelter['id'], ShelterLayerEntry>;

export function createShelterLayerRegistry(): ShelterLayerRegistry {
  return new Map();
}

export function shouldRenderShelterMarkers(zoom: number, count: number): boolean {
  return zoom >= SHELTER_MARKER_MIN_ZOOM || count <= SHELTER_MARKER_LIMIT_BELOW_MIN_ZOOM;
}

export function getShelterLayerStyle(
  shelter: Shelter,
  selectedTypes: readonly ShelterTypeKey[],
): ShelterLayerStyle {
  if (selectedTypes.length === 0) {
    return 'default';
  }
  return matchesShelterTypes(shelter, selectedTypes) ? 'match' : 'dim';
}

const shelterPinIcons = new Map<ShelterLayerStyle, L.DivIcon>();

function getShelterPinIcon(style: ShelterLayerStyle): L.DivIcon {
  const cached = shelterPinIcons.get(style);
  if (cached) {
    return cached;
  }

  // The pin is a square rotated by 45 degrees, so its tip sits about 16px below the center.
  const icon = L.divIcon({
    className: 'shelter-pin-icon',
    html: `<span class="shelter-pin shelter-pin-${style}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 27],
    popupAnchor: [0, -24],
  });
  shelterPinIcons.set(style, icon);
  return icon;
}

function createShelterLayer(
  shelter: Shelter,
  kind: ShelterLayerKind,
  style: ShelterLayerStyle,
): L.Layer {
  const latLng: L.LatLngTuple = [shelter.latitude, shelter.longitude];
  const layer =
    kind === 'marker'
      ? L.marker(latLng, {
          icon: getShelterPinIcon(style),
          zIndexOffset: SHELTER_MARKER_Z_INDEX_OFFSETS[style],
          title: shelter.name,
        })
      : L.circleMarker(latLng, SHELTER_CIRCLE_STYLES[style]);

  return layer.bindPopup(getPopupContent(shelter), SHELTER_POPUP_OPTIONS);
}

export function syncShelterLayers(
  group: L.LayerGroup,
  registry: ShelterLayerRegistry,
  shelters: Shelter[],
  zoom: number,
  selectedTypes: readonly ShelterTypeKey[] = [],
): void {
  const kind: ShelterLayerKind = shouldRenderShelterMarkers(zoom, shelters.length)
    ? 'marker'
    : 'circle';
  const nextStyles = new Map(
    shelters.map((shelter) => [shelter.id, getShelterLayerStyle(shelter, selectedTypes)]),
  );

  for (const [shelterId, entry] of registry) {
    if (entry.kind === kind && entry.style === nextStyles.get(shelterId)) {
      continue;
    }

    group.removeLayer(entry.layer);
    registry.delete(shelterId);
  }

  for (const shelter of shelters) {
    if (registry.has(shelter.id)) {
      continue;
    }

    const style = nextStyles.get(shelter.id) ?? 'default';
    const layer = createShelterLayer(shelter, kind, style);
    layer.addTo(group);
    registry.set(shelter.id, { kind, style, layer });
  }
}

export function findShelterIdByLayer(
  registry: ShelterLayerRegistry,
  layer: L.Layer,
): Shelter['id'] | undefined {
  for (const [shelterId, entry] of registry) {
    if (entry.layer === layer) {
      return shelterId;
    }
  }
  return undefined;
}
