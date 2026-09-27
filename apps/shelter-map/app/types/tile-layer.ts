interface TileLayerDefinition {
  label: string;
  url: string;
  attribution: string;
}

export const TILE_LAYERS = {
  osm: {
    label: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
  },
  gia_photo: {
    label: '国土地理院 (写真)',
    url: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg',
    attribution: '© 国土地理院',
  },
} as const satisfies Record<string, TileLayerDefinition>;

export type TileLayerKey = keyof typeof TILE_LAYERS;

export const tileLayerKeys = Object.keys(TILE_LAYERS) as TileLayerKey[];

export const DEFAULT_TILE_LAYER: TileLayerKey = 'osm';

export const TILE_LAYER_ZOOM_OPTIONS = {
  minZoom: 5,
  maxZoom: 18,
} as const;
