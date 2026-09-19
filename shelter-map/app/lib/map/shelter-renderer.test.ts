import type { LayerGroup } from 'leaflet';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createShelter } from '~/test/fixtures';

const mockCircle = {
  bindPopup: vi.fn().mockReturnThis(),
  addTo: vi.fn().mockReturnThis(),
};

const mockMarker = {
  bindPopup: vi.fn().mockReturnThis(),
  addTo: vi.fn().mockReturnThis(),
};

vi.mock('~/lib/leaflet', () => ({
  L: {
    circle: vi.fn(() => mockCircle),
    marker: vi.fn(() => mockMarker),
  },
}));

import { L } from '~/lib/leaflet';
import {
  renderShelterCircles,
  renderShelterMarkers,
  shouldRenderShelterMarkers,
} from '~/lib/map/shelter-renderer';

function createGroup(): LayerGroup & { clearLayers: ReturnType<typeof vi.fn> } {
  return { clearLayers: vi.fn() } as unknown as LayerGroup & {
    clearLayers: ReturnType<typeof vi.fn>;
  };
}

const shelters = Array.from({ length: 101 }, (_, index) =>
  createShelter({ name: `避難所${index}`, latitude: 35 + index / 1000 }),
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('shouldRenderShelterMarkers', () => {
  it('skips markers when zoom is below 15 and there are more than 100 shelters', () => {
    expect(shouldRenderShelterMarkers(14, 101)).toBe(false);
  });

  it('renders markers when zoom is high enough', () => {
    expect(shouldRenderShelterMarkers(15, 101)).toBe(true);
  });

  it('renders markers when zoom is below 15 but count is 100 or fewer', () => {
    expect(shouldRenderShelterMarkers(10, 100)).toBe(true);
  });
});

describe('renderShelterCircles', () => {
  it('replaces the group contents with one circle per shelter', () => {
    const group = createGroup();
    const [first, second] = shelters;

    renderShelterCircles(group, shelters.slice(0, 2));

    expect(group.clearLayers).toHaveBeenCalledOnce();
    expect(L.circle).toHaveBeenCalledTimes(2);
    expect(L.circle).toHaveBeenCalledWith(
      [first?.latitude, first?.longitude],
      expect.objectContaining({ radius: 20 }),
    );
    expect(L.circle).toHaveBeenCalledWith(
      [second?.latitude, second?.longitude],
      expect.any(Object),
    );
    expect(mockCircle.bindPopup).toHaveBeenCalledTimes(2);
    expect(mockCircle.addTo).toHaveBeenCalledWith(group);
  });
});

describe('renderShelterMarkers', () => {
  it('replaces the group contents with one marker per shelter', () => {
    const group = createGroup();

    renderShelterMarkers(group, [createShelter()], 15);

    expect(group.clearLayers).toHaveBeenCalledOnce();
    expect(L.marker).toHaveBeenCalledOnce();
    expect(mockMarker.addTo).toHaveBeenCalledWith(group);
  });

  it('only clears the group when too many shelters are visible at low zoom', () => {
    const group = createGroup();

    renderShelterMarkers(group, shelters, 14);

    expect(group.clearLayers).toHaveBeenCalledOnce();
    expect(L.marker).not.toHaveBeenCalled();
  });
});
