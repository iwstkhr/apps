import { useCallback, useEffect, useRef, useState } from 'react';
import { bindModifierScrollWheelZoom, L } from '~/lib/leaflet';
import { INITIAL_ZOOM, MAP_CENTER } from '~/lib/map/constants';
import {
  DEFAULT_TILE_LAYER,
  TILE_LAYER_ZOOM_OPTIONS,
  TILE_LAYERS,
  type TileLayerKey,
  tileLayerKeys,
} from '~/types/tile-layer';

function createTileLayers(): Record<TileLayerKey, L.TileLayer> {
  return Object.fromEntries(
    tileLayerKeys.map((key) => {
      const { url, attribution } = TILE_LAYERS[key];
      return [key, L.tileLayer(url, { ...TILE_LAYER_ZOOM_OPTIONS, attribution })];
    }),
  ) as Record<TileLayerKey, L.TileLayer>;
}

export function useLeafletMap(mapContainerRef: React.RefObject<HTMLDivElement | null>) {
  const mapRef = useRef<L.Map | null>(null);
  const tileLayersRef = useRef<Record<TileLayerKey, L.TileLayer> | null>(null);
  const activeTileLayerRef = useRef<TileLayerKey>(DEFAULT_TILE_LAYER);
  const [mapReady, setMapReady] = useState(false);

  const changeTileLayer = useCallback((tileLayer: TileLayerKey) => {
    const map = mapRef.current;
    const tileLayers = tileLayersRef.current;

    if (!map || !tileLayers || activeTileLayerRef.current === tileLayer) {
      return;
    }

    tileLayers[activeTileLayerRef.current].remove();
    map.addLayer(tileLayers[tileLayer]);
    activeTileLayerRef.current = tileLayer;
  }, []);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) {
      return;
    }

    const map = L.map(container, {
      preferCanvas: true,
      scrollWheelZoom: false,
      zoomControl: true,
    }).setView(MAP_CENTER, INITIAL_ZOOM);
    mapRef.current = map;
    setMapReady(true);
    const unbindModifierScrollWheelZoom = bindModifierScrollWheelZoom(map);

    const tileLayers = createTileLayers();
    tileLayersRef.current = tileLayers;
    activeTileLayerRef.current = DEFAULT_TILE_LAYER;
    map.addLayer(tileLayers[DEFAULT_TILE_LAYER]);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(container);

    return () => {
      setMapReady(false);
      resizeObserver.disconnect();
      unbindModifierScrollWheelZoom();
      map.remove();
      mapRef.current = null;
      tileLayersRef.current = null;
      activeTileLayerRef.current = DEFAULT_TILE_LAYER;
    };
  }, [mapContainerRef]);

  return { mapRef, mapReady, changeTileLayer };
}
