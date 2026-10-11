// @vitest-environment happy-dom

import { act, renderHook, waitFor } from '@testing-library/react';
import type { Map as LeafletMap } from 'leaflet';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLeafletMap } from '~/hooks/use-leaflet-map';
import { useShelterData } from '~/hooks/use-shelter-data';
import { useShelterMap } from '~/hooks/use-shelter-map';
import { L } from '~/lib/leaflet';
import * as shelterRenderer from '~/lib/map/shelter-renderer';
import * as viewportFilter from '~/lib/map/viewport-filter';
import { createShelter } from '~/test/fixtures';
import { emptyShelterFilters, type ShelterFilters } from '~/types/shelter-filters';

vi.mock('~/hooks/use-leaflet-map');
vi.mock('~/hooks/use-shelter-data');

const yokohama = createShelter({ id: 'yokohama', name: '横浜避難所' });
const kawasaki = createShelter({ id: 'kawasaki', name: '川崎避難所', address: '神奈川県川崎市' });
const shelters = [yokohama, kawasaki];

const mockMap = {
  on: vi.fn(),
  off: vi.fn(),
  addLayer: vi.fn(),
  getZoom: vi.fn(() => 15),
  getSize: vi.fn(() => ({ x: 800, y: 600 })),
  flyTo: vi.fn(),
  invalidateSize: vi.fn(),
} as unknown as LeafletMap & {
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  addLayer: ReturnType<typeof vi.fn>;
  getSize: ReturnType<typeof vi.fn>;
  flyTo: ReturnType<typeof vi.fn>;
};

function getMoveEndHandler(): () => void {
  const handler = mockMap.on.mock.calls
    .filter((call: unknown[]) => call[0] === 'moveend')
    .at(-1)?.[1];
  if (typeof handler !== 'function') {
    throw new Error('expected moveend handler');
  }
  return handler;
}

const changeTileLayer = vi.fn();

describe('useShelterMap', () => {
  beforeEach(() => {
    vi.mocked(useLeafletMap).mockReturnValue({
      mapRef: { current: mockMap },
      mapReady: true,
      changeTileLayer,
    });
    vi.mocked(useShelterData).mockReturnValue({
      shelters,
      isLoading: false,
      loadError: null,
    });
    vi.spyOn(viewportFilter, 'filterSheltersWithinMap').mockImplementation((_map, items) => items);
    vi.spyOn(shelterRenderer, 'syncShelterLayers').mockImplementation(() => {});
    changeTileLayer.mockReset();
    mockMap.addLayer.mockClear();
    mockMap.on.mockClear();
    mockMap.flyTo.mockClear();
    mockMap.getSize.mockReturnValue({ x: 800, y: 600 });
  });

  it('renders shelters when map and data are ready', async () => {
    const mapContainerRef = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useShelterMap(mapContainerRef, emptyShelterFilters));

    await waitFor(() => {
      expect(result.current.displayedShelters).toEqual(shelters);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.loadError).toBeNull();
    expect(shelterRenderer.syncShelterLayers).toHaveBeenCalled();
  });

  it('updates displayed shelters when filters change', async () => {
    const mapContainerRef = createRef<HTMLDivElement>();
    const { result, rerender } = renderHook(
      ({ filters }: { filters: ShelterFilters }) => useShelterMap(mapContainerRef, filters),
      { initialProps: { filters: emptyShelterFilters } },
    );

    await waitFor(() => {
      expect(result.current.displayedShelters).toEqual(shelters);
    });

    rerender({ filters: { ...emptyShelterFilters, keyword: '横浜' } });

    expect(result.current.displayedShelters).toEqual([yokohama]);
    expect(shelterRenderer.syncShelterLayers).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.any(Map),
      [yokohama],
      15,
      [],
    );
  });

  it('applies filters entered while data is loading once data loads', async () => {
    vi.mocked(useShelterData).mockReturnValue({
      shelters: [],
      isLoading: true,
      loadError: null,
    });

    const mapContainerRef = createRef<HTMLDivElement>();
    const filters = { ...emptyShelterFilters, keyword: '横浜' };
    const { result, rerender } = renderHook(() => useShelterMap(mapContainerRef, filters));

    expect(result.current.displayedShelters).toEqual([]);

    vi.mocked(useShelterData).mockReturnValue({
      shelters,
      isLoading: false,
      loadError: null,
    });
    rerender();

    await waitFor(() => {
      expect(result.current.displayedShelters).toEqual([yokohama]);
    });
    expect(shelterRenderer.syncShelterLayers).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.any(Map),
      [yokohama],
      15,
      [],
    );
  });

  it('keeps the full filtered list in the table when the map moves', async () => {
    vi.spyOn(viewportFilter, 'filterSheltersWithinMap')
      .mockReturnValueOnce(shelters)
      .mockReturnValue([yokohama]);

    const mapContainerRef = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useShelterMap(mapContainerRef, emptyShelterFilters));

    await waitFor(() => {
      expect(result.current.displayedShelters).toEqual(shelters);
    });

    act(() => {
      getMoveEndHandler()();
    });

    expect(result.current.displayedShelters).toEqual(shelters);
    expect(result.current.visibleShelters).toEqual([yokohama]);
    expect(shelterRenderer.syncShelterLayers).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.any(Map),
      [yokohama],
      15,
      [],
    );
  });

  it('keeps the last viewport while the map is hidden', async () => {
    const mapContainerRef = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useShelterMap(mapContainerRef, emptyShelterFilters));

    await waitFor(() => {
      expect(result.current.visibleShelters).toEqual(shelters);
    });

    vi.spyOn(viewportFilter, 'filterSheltersWithinMap').mockReturnValue([]);
    mockMap.getSize.mockReturnValue({ x: 0, y: 0 });
    act(() => {
      getMoveEndHandler()();
    });

    expect(result.current.visibleShelters).toEqual(shelters);
  });

  it('flies to a selected shelter and opens its popup once the map stops moving', async () => {
    const openPopup = vi.fn();
    vi.mocked(shelterRenderer.syncShelterLayers).mockImplementation((_group, registry) => {
      registry.set(kawasaki.id, {
        kind: 'marker',
        style: 'default',
        layer: { openPopup } as unknown as L.Layer,
      });
    });

    const mapContainerRef = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useShelterMap(mapContainerRef, emptyShelterFilters));

    await waitFor(() => {
      expect(result.current.visibleShelters).toEqual(shelters);
    });

    act(() => {
      result.current.focusShelter(kawasaki);
    });

    expect(result.current.selectedShelterId).toBe('kawasaki');
    expect(mockMap.flyTo).toHaveBeenCalledWith([kawasaki.latitude, kawasaki.longitude], 16);
    expect(openPopup).not.toHaveBeenCalled();

    act(() => {
      getMoveEndHandler()();
    });
    expect(openPopup).toHaveBeenCalledOnce();

    // Later moves do not reopen it
    act(() => {
      getMoveEndHandler()();
    });
    expect(openPopup).toHaveBeenCalledOnce();
  });

  it('keeps the shelter with an open popup on the map after it leaves the viewport', async () => {
    const kawasakiLayer = {} as L.Layer;
    vi.mocked(shelterRenderer.syncShelterLayers).mockImplementation((_group, registry) => {
      registry.set(kawasaki.id, { kind: 'marker', style: 'default', layer: kawasakiLayer });
    });

    const mapContainerRef = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useShelterMap(mapContainerRef, emptyShelterFilters));

    await waitFor(() => {
      expect(result.current.visibleShelters).toEqual(shelters);
    });

    const shelterGroup = mockMap.addLayer.mock.calls
      .map((call: unknown[]) => call[0])
      .find((layer: unknown) => layer instanceof L.FeatureGroup) as L.FeatureGroup;
    act(() => {
      shelterGroup.fire('popupopen', { layer: kawasakiLayer, popup: {} });
    });
    expect(result.current.selectedShelterId).toBe('kawasaki');

    vi.spyOn(viewportFilter, 'filterSheltersWithinMap').mockReturnValue([yokohama]);
    act(() => {
      getMoveEndHandler()();
    });

    expect(result.current.visibleShelters).toEqual([yokohama]);
    expect(shelterRenderer.syncShelterLayers).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.any(Map),
      [yokohama, kawasaki],
      15,
      [],
    );
  });

  it('adds shelter layer groups to the map and removes them on unmount', async () => {
    const removeSpy = vi.spyOn(L.LayerGroup.prototype, 'remove');

    const mapContainerRef = createRef<HTMLDivElement>();
    const { result, unmount } = renderHook(() =>
      useShelterMap(mapContainerRef, emptyShelterFilters),
    );

    await waitFor(() => {
      expect(result.current.displayedShelters).toEqual(shelters);
    });

    // The shelter layers and the current location layer
    const addedLayers = mockMap.addLayer.mock.calls.map((call: unknown[]) => call[0]);
    expect(addedLayers).toHaveLength(2);
    expect(addedLayers.every((layer: unknown) => layer instanceof L.LayerGroup)).toBe(true);
    const shelterGroup = addedLayers.find((layer: unknown) => layer instanceof L.FeatureGroup);
    expect(shelterRenderer.syncShelterLayers).toHaveBeenLastCalledWith(
      shelterGroup,
      expect.any(Map),
      shelters,
      15,
      [],
    );

    removeSpy.mockClear();
    unmount();

    expect(removeSpy).toHaveBeenCalledTimes(2);
    removeSpy.mockRestore();
  });

  it('exposes loading and error state from useShelterData', () => {
    vi.mocked(useShelterData).mockReturnValue({
      shelters: [],
      isLoading: true,
      loadError: 'network error',
    });

    const mapContainerRef = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useShelterMap(mapContainerRef, emptyShelterFilters));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.loadError).toBe('network error');
    expect(result.current.displayedShelters).toEqual([]);
  });

  it('forwards tile layer changes to useLeafletMap', async () => {
    const mapContainerRef = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useShelterMap(mapContainerRef, emptyShelterFilters));

    await waitFor(() => {
      expect(result.current.displayedShelters).toEqual(shelters);
    });

    act(() => {
      result.current.changeTileLayer('gia_photo');
    });

    expect(changeTileLayer).toHaveBeenCalledWith('gia_photo');
  });
});
