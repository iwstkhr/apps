import { L } from '~/lib/leaflet';
import {
  getShelterCircleRadiusScale,
  SHELTER_CIRCLE_STYLES,
  SHELTER_MARKER_LIMIT_BELOW_MIN_ZOOM,
  SHELTER_MARKER_MIN_ZOOM,
  SHELTER_MULTI_TYPE_MATCH_COLOR,
  SHELTER_POPUP_OPTIONS,
  type ShelterLayerStyle,
} from '~/lib/map/constants';
import { getPopupContent } from '~/lib/map/shelter-popup';
import type { Shelter } from '~/types/shelter';
import { SHELTER_TYPE_COLORS, type ShelterTypeKey } from '~/types/shelter-type';

type ShelterLayerKind = 'circle' | 'marker';

interface ShelterLayerEntry {
  kind: ShelterLayerKind;
  style: ShelterLayerStyle;
  layer: L.Layer;
  /** Match style only: the fill color, which follows the selected disaster types. */
  matchColor?: string;
  /** Circles only: the zoom-dependent scale their radius was last set with. */
  radiusScale?: number;
}

export type ShelterLayerRegistry = Map<Shelter['id'], ShelterLayerEntry>;

export function createShelterLayerRegistry(): ShelterLayerRegistry {
  return new Map();
}

export function shouldRenderShelterMarkers(zoom: number, count: number): boolean {
  return zoom >= SHELTER_MARKER_MIN_ZOOM || count <= SHELTER_MARKER_LIMIT_BELOW_MIN_ZOOM;
}

// Shelters missing a selected type are filtered out, so every visible shelter shares one style.
export function getShelterLayerStyle(selectedTypes: readonly ShelterTypeKey[]): ShelterLayerStyle {
  return selectedTypes.length === 0 ? 'default' : 'match';
}

/** One selected type colors its matches; several selected types use a neutral color. */
export function getShelterMatchColor(selectedTypes: readonly ShelterTypeKey[]): string {
  const [onlyType] = selectedTypes;
  return selectedTypes.length === 1 && onlyType
    ? SHELTER_TYPE_COLORS[onlyType]
    : SHELTER_MULTI_TYPE_MATCH_COLOR;
}

const shelterPinIcons = new Map<string, L.DivIcon>();

function getShelterPinIcon(style: ShelterLayerStyle, matchColor?: string): L.DivIcon {
  const cacheKey = `${style}:${matchColor ?? ''}`;
  const cached = shelterPinIcons.get(cacheKey);
  if (cached) {
    return cached;
  }

  const fillStyle = matchColor ? ` style="--pin-fill: ${matchColor}"` : '';
  // The pin is a square rotated by 45 degrees, so its tip sits about 16px below the center.
  const icon = L.divIcon({
    className: 'shelter-pin-icon',
    html: `<span class="shelter-pin shelter-pin-${style}"${fillStyle}></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 27],
    popupAnchor: [0, -24],
  });
  shelterPinIcons.set(cacheKey, icon);
  return icon;
}

function getCircleRadius(style: ShelterLayerStyle, radiusScale: number): number {
  return SHELTER_CIRCLE_STYLES[style].radius * radiusScale;
}

function createShelterLayer(
  shelter: Shelter,
  kind: ShelterLayerKind,
  style: ShelterLayerStyle,
  radiusScale: number,
  matchColor: string | undefined,
): L.Layer {
  const latLng: L.LatLngTuple = [shelter.latitude, shelter.longitude];
  const layer =
    kind === 'marker'
      ? L.marker(latLng, {
          icon: getShelterPinIcon(style, matchColor),
          title: shelter.name,
        })
      : L.circleMarker(latLng, {
          ...SHELTER_CIRCLE_STYLES[style],
          ...(matchColor && { fillColor: matchColor }),
          radius: getCircleRadius(style, radiusScale),
        });

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
  const radiusScale = getShelterCircleRadiusScale(zoom);
  const style = getShelterLayerStyle(selectedTypes);
  const matchColor = style === 'match' ? getShelterMatchColor(selectedTypes) : undefined;
  const nextShelterIds = new Set(shelters.map((shelter) => shelter.id));

  for (const [shelterId, entry] of registry) {
    if (
      !nextShelterIds.has(shelterId) ||
      entry.kind !== kind ||
      entry.style !== style ||
      entry.matchColor !== matchColor
    ) {
      group.removeLayer(entry.layer);
      registry.delete(shelterId);
    } else if (entry.kind === 'circle' && entry.radiusScale !== radiusScale) {
      (entry.layer as L.CircleMarker).setRadius(getCircleRadius(entry.style, radiusScale));
      entry.radiusScale = radiusScale;
    }
  }

  for (const shelter of shelters) {
    if (registry.has(shelter.id)) {
      continue;
    }

    const layer = createShelterLayer(shelter, kind, style, radiusScale, matchColor);
    layer.addTo(group);
    registry.set(shelter.id, {
      kind,
      style,
      layer,
      matchColor,
      radiusScale: kind === 'circle' ? radiusScale : undefined,
    });
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
