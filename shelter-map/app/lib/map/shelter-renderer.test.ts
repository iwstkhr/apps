import type { Circle, Map as LeafletMap, Marker } from 'leaflet';
import { describe, expect, it, vi } from 'vitest';
import { createShelter } from '~/test/fixtures';

const mockCircle = {
  bindPopup: vi.fn().mockReturnThis(),
  addTo: vi.fn().mockReturnThis(),
  remove: vi.fn(),
};

const mockMarker = {
  bindPopup: vi.fn().mockReturnThis(),
  addTo: vi.fn().mockReturnThis(),
  remove: vi.fn(),
};

vi.mock('~/lib/leaflet', () => ({
  L: {
    circle: vi.fn(() => mockCircle),
    marker: vi.fn(() => mockMarker),
  },
}));

import {
  addShelterMarkers,
  clearShelterCircles,
  clearShelterMarkers,
  renderShelterMarkers,
} from '~/lib/map/shelter-renderer';

function createMap(zoom: number): LeafletMap {
  return { getZoom: () => zoom } as LeafletMap;
}

describe('clearShelterCircles', () => {
  it('removes each circle from the map', () => {
    const circles = [{ remove: vi.fn() }, { remove: vi.fn() }] as unknown as Circle[];

    clearShelterCircles(circles);

    expect(circles[0]?.remove).toHaveBeenCalledOnce();
    expect(circles[1]?.remove).toHaveBeenCalledOnce();
  });
});

describe('clearShelterMarkers', () => {
  it('removes each marker from the map', () => {
    const markers = [{ remove: vi.fn() }, { remove: vi.fn() }] as unknown as Marker[];

    clearShelterMarkers(markers);

    expect(markers[0]?.remove).toHaveBeenCalledOnce();
    expect(markers[1]?.remove).toHaveBeenCalledOnce();
  });
});

describe('addShelterMarkers', () => {
  const shelters = Array.from({ length: 101 }, (_, index) =>
    createShelter({ name: `避難所${index}` }),
  );

  it('skips markers when zoom is below 15 and there are more than 100 shelters', () => {
    expect(addShelterMarkers(createMap(14), shelters)).toEqual([]);
  });

  it('creates markers when zoom is high enough', () => {
    const markers = addShelterMarkers(createMap(15), [createShelter()]);

    expect(markers).toHaveLength(1);
  });

  it('creates markers for large sets when zoom is below 15 but count is 100 or fewer', () => {
    const markers = addShelterMarkers(createMap(10), shelters.slice(0, 100));

    expect(markers).toHaveLength(100);
  });
});

describe('renderShelterMarkers', () => {
  it('clears existing markers before adding new ones', () => {
    const existing = [{ remove: vi.fn() }] as unknown as Marker[];
    const map = createMap(15);

    renderShelterMarkers(map, [createShelter()], existing);

    expect(existing[0]?.remove).toHaveBeenCalledOnce();
  });
});
