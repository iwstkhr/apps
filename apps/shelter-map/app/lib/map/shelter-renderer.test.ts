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
    circleMarker: vi.fn(() => mockCircle),
    marker: vi.fn(() => mockMarker),
    divIcon: vi.fn((options: { html: string }) => options),
  },
}));

import { L } from '~/lib/leaflet';
import {
  createShelterLayerRegistry,
  getShelterLayerStyle,
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

describe('getShelterLayerStyle', () => {
  it('uses the default style when no disaster type is selected', () => {
    expect(getShelterLayerStyle(createShelter(), [])).toBe('default');
  });

  it('distinguishes shelters that match every selected type', () => {
    expect(getShelterLayerStyle(createShelter(), ['flood', 'earthquake'])).toBe('match');
    expect(getShelterLayerStyle(createShelter(), ['flood', 'tsunami'])).toBe('dim');
  });
});

describe('syncShelterLayers', () => {
  it('renders circles for visible shelters when many are shown below the minimum zoom', () => {
    const group = createGroup();
    const registry = createShelterLayerRegistry();
    const [first, second] = shelters;

    syncShelterLayers(group, registry, shelters, 14);

    expect(group.removeLayer).not.toHaveBeenCalled();
    expect(L.circleMarker).toHaveBeenCalledTimes(101);
    expect(L.circleMarker).toHaveBeenCalledWith(
      [first?.latitude, first?.longitude],
      expect.objectContaining({ fillColor: '#3b82f6' }),
    );
    expect(L.circleMarker).toHaveBeenCalledWith(
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

    registry.set(first.id, { kind: 'marker', style: 'default', layer: firstLayer });
    registry.set(second.id, { kind: 'marker', style: 'default', layer: secondLayer });

    syncShelterLayers(group, registry, [firstCopy, third], 15);

    expect(group.removeLayer).toHaveBeenCalledOnce();
    expect(group.removeLayer).toHaveBeenCalledWith(secondLayer);
    expect(L.marker).toHaveBeenCalledOnce();
    expect(registry.get(first.id)?.layer).toBe(firstLayer);
    expect(registry.has(second.id)).toBe(false);
    expect(registry.has(third.id)).toBe(true);
  });

  it('renders pins colored by the selected disaster types', () => {
    const group = createGroup();
    const registry = createShelterLayerRegistry();

    syncShelterLayers(group, registry, [createShelter()], 15, ['tsunami']);

    expect(L.marker).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        icon: expect.objectContaining({ html: expect.stringContaining('shelter-pin-dim') }),
      }),
    );
    expect(registry.get('test-id')?.style).toBe('dim');
  });

  it('recreates a layer when its style changes', () => {
    const group = createGroup();
    const registry = createShelterLayerRegistry();
    const shelter = createShelter();
    const oldLayer = {} as Layer;
    registry.set(shelter.id, { kind: 'marker', style: 'default', layer: oldLayer });

    syncShelterLayers(group, registry, [shelter], 15, ['flood']);

    expect(group.removeLayer).toHaveBeenCalledWith(oldLayer);
    expect(registry.get(shelter.id)?.style).toBe('match');
  });

  it('resizes existing circles when the zoom changes their scale', () => {
    const group = createGroup();
    const registry = createShelterLayerRegistry();
    const setRadius = vi.fn();
    const shelter = createShelter();
    registry.set(shelter.id, {
      kind: 'circle',
      style: 'default',
      layer: { setRadius } as unknown as Layer,
      radiusScale: 0.5,
    });

    syncShelterLayers(group, registry, shelters.slice(0, 101).concat(shelter), 13);

    expect(setRadius).toHaveBeenCalledWith(6);
    expect(registry.get(shelter.id)?.radiusScale).toBe(1);
  });

  it('adds dimmed shelters before matching ones so matches are drawn on top', () => {
    const group = createGroup();
    const registry = createShelterLayerRegistry();
    const matching = createShelter({
      id: 'matching',
      type: { ...createShelter().type, tsunami: true },
    });
    const dimmed = createShelter({ id: 'dimmed' });

    syncShelterLayers(group, registry, [matching, dimmed], 15, ['tsunami']);

    expect([...registry.keys()]).toEqual(['dimmed', 'matching']);
  });
});
