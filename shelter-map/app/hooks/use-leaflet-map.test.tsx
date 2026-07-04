// @vitest-environment happy-dom

import { render, waitFor } from '@testing-library/react';
import { useEffect, useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLeafletMap } from '~/hooks/use-leaflet-map';
import { INITIAL_ZOOM, MAP_CENTER } from '~/lib/map/constants';

const tileLayerOsm = { remove: vi.fn() };
const tileLayerGiaPhoto = { remove: vi.fn() };
const mockMap = {
  setView: vi.fn().mockReturnThis(),
  addLayer: vi.fn(),
  remove: vi.fn(),
  invalidateSize: vi.fn(),
};

const unbindModifierScrollWheelZoom = vi.fn();

vi.mock('~/lib/leaflet', () => ({
  bindModifierScrollWheelZoom: vi.fn(() => unbindModifierScrollWheelZoom),
  L: {
    map: vi.fn(() => mockMap),
    tileLayer: vi.fn((url: string) =>
      url.includes('openstreetmap') ? tileLayerOsm : tileLayerGiaPhoto,
    ),
  },
}));

function MapHarness({ onReady }: { onReady: (api: ReturnType<typeof useLeafletMap>) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const api = useLeafletMap(containerRef);

  useEffect(() => {
    if (api.mapReady) {
      onReady(api);
    }
  }, [api, onReady]);

  return <div ref={containerRef} data-testid="map-container" style={{ width: 400, height: 400 }} />;
}

describe('useLeafletMap', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initializes a Leaflet map on the container', async () => {
    let api: ReturnType<typeof useLeafletMap> | undefined;

    render(
      <MapHarness
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    await waitFor(() => {
      expect(api?.mapReady).toBe(true);
    });

    const { L, bindModifierScrollWheelZoom } = await import('~/lib/leaflet');

    expect(L.map).toHaveBeenCalledOnce();
    expect(mockMap.setView).toHaveBeenCalledWith(MAP_CENTER, INITIAL_ZOOM);
    expect(L.tileLayer).toHaveBeenCalledTimes(2);
    expect(mockMap.addLayer).toHaveBeenCalledWith(tileLayerOsm);
    expect(bindModifierScrollWheelZoom).toHaveBeenCalledWith(mockMap);
  });

  it('switches between OSM and GSI photo tile layers', async () => {
    let api: ReturnType<typeof useLeafletMap> | undefined;

    render(
      <MapHarness
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    await waitFor(() => {
      expect(api?.mapReady).toBe(true);
    });

    api?.changeTileLayer('gia_photo');

    expect(tileLayerOsm.remove).toHaveBeenCalled();
    expect(tileLayerGiaPhoto.remove).toHaveBeenCalled();
    expect(mockMap.addLayer).toHaveBeenLastCalledWith(tileLayerGiaPhoto);

    api?.changeTileLayer('osm');

    expect(mockMap.addLayer).toHaveBeenLastCalledWith(tileLayerOsm);
  });
});
