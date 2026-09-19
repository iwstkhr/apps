import type { Layer, LayerGroup } from 'leaflet';
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
  createShelterLayerRegistry,
  shouldRenderShelterMarkers,
  syncShelterLayers,
} from '~/lib/map/shelter-renderer';

function createGroup(): LayerGroup & { removeLayer: ReturnType<typeof vi.fn> } {
  return { removeLayer: vi.fn() } as unknown as LayerGroup & {
    removeLayer: ReturnType<typeof vi.fn>;
  };
}

const shelters = Array.from({ length: 101 }, (_, index) =>
  createShelter({ id: `shelter-${index}`, name: `避難所${index}`, latitude: 35 + index / 1000 }),
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

describe('syncShelterLayers', () => {
  it('renders circles for visible shelters when many are shown below the minimum zoom', () => {
    const group = createGroup();
    const registry = createShelterLayerRegistry();
    const [first, second] = shelters;

    syncShelterLayers(group, registry, shelters, 14);

    expect(group.removeLayer).not.toHaveBeenCalled();
    expect(L.circle).toHaveBeenCalledTimes(101);
    expect(L.circle).toHaveBeenCalledWith(
      [first?.latitude, first?.longitude],
      expect.objectContaining({ radius: 20 }),
    );
    expect(L.circle).toHaveBeenCalledWith(
      [second?.latitude, second?.longitude],
      expect.any(Object),
    );
    expect(mockCircle.bindPopup).toHaveBeenCalledTimes(101);
    expect(mockCircle.addTo).toHaveBeenCalledWith(group);
    expect(registry).toHaveLength(101);
  });

  it('renders markers when zoomed in', () => {
    const group = createGroup();
    const registry = createShelterLayerRegistry();

    syncShelterLayers(group, registry, [createShelter()], 15);

    expect(L.marker).toHaveBeenCalledOnce();
    expect(mockMarker.addTo).toHaveBeenCalledWith(group);
  });

  it('keeps unchanged layers and only removes shelters that leave the viewport', () => {
    const group = createGroup();
    const registry = createShelterLayerRegistry();
    const first = createShelter({ id: 'first', name: '第一避難所' });
    const firstCopy = { ...first };
    const second = createShelter({ id: 'second', name: '第二避難所' });
    const third = createShelter({ id: 'third', name: '第三避難所' });
    const firstLayer = {} as Layer;
    const secondLayer = {} as Layer;

    registry.set(first.id, { kind: 'marker', layer: firstLayer });
    registry.set(second.id, { kind: 'marker', layer: secondLayer });

    syncShelterLayers(group, registry, [firstCopy, third], 15);

    expect(group.removeLayer).toHaveBeenCalledOnce();
    expect(group.removeLayer).toHaveBeenCalledWith(secondLayer);
    expect(L.marker).toHaveBeenCalledOnce();
    expect(registry.get(first.id)?.layer).toBe(firstLayer);
    expect(registry.has(second.id)).toBe(false);
    expect(registry.has(third.id)).toBe(true);
  });
});
