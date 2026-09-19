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
import { emptyShelterColumnFilters } from '~/types/shelter-filters';

vi.mock('~/hooks/use-leaflet-map');
vi.mock('~/hooks/use-shelter-data');

const shelters = [
  createShelter({ name: '横浜避難所' }),
  createShelter({ name: '川崎避難所', address: '神奈川県川崎市' }),
];

const mockMap = {
  on: vi.fn(),
  off: vi.fn(),
  addLayer: vi.fn(),
  getZoom: vi.fn(() => 15),
} as unknown as LeafletMap & {
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  addLayer: ReturnType<typeof vi.fn>;
};

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
    vi.spyOn(shelterRenderer, 'renderShelterCircles').mockImplementation(() => {});
    vi.spyOn(shelterRenderer, 'renderShelterMarkers').mockImplementation(() => {});
    changeTileLayer.mockReset();
    mockMap.addLayer.mockClear();
  });

  it('renders shelters when map and data are ready', async () => {
    const mapContainerRef = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useShelterMap(mapContainerRef));

    await waitFor(() => {
      expect(result.current.displayedShelters).toEqual(shelters);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.loadError).toBeNull();
    expect(shelterRenderer.renderShelterCircles).toHaveBeenCalled();
    expect(shelterRenderer.renderShelterMarkers).toHaveBeenCalled();
  });

  it('updates displayed shelters when column filters change', async () => {
    const firstShelter = shelters[0];
    if (!firstShelter) {
      throw new Error('expected shelter fixture');
    }

    const mapContainerRef = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useShelterMap(mapContainerRef));

    await waitFor(() => {
      expect(result.current.displayedShelters).toEqual(shelters);
    });

    act(() => {
      result.current.updateColumnFilters({
        ...emptyShelterColumnFilters,
        name: '横浜',
      });
    });

    expect(result.current.displayedShelters).toEqual([firstShelter]);
    expect(shelterRenderer.renderShelterCircles).toHaveBeenLastCalledWith(expect.anything(), [
      firstShelter,
    ]);
  });

  it('applies column filters entered while data is loading once data loads', async () => {
    const firstShelter = shelters[0];
    if (!firstShelter) {
      throw new Error('expected shelter fixture');
    }

    vi.mocked(useShelterData).mockReturnValue({
      shelters: [],
      isLoading: true,
      loadError: null,
    });

    const mapContainerRef = createRef<HTMLDivElement>();
    const { result, rerender } = renderHook(() => useShelterMap(mapContainerRef));

    act(() => {
      result.current.updateColumnFilters({
        ...emptyShelterColumnFilters,
        name: '横浜',
      });
    });

    expect(result.current.displayedShelters).toEqual([]);
    const updateColumnFiltersWhileLoading = result.current.updateColumnFilters;

    vi.mocked(useShelterData).mockReturnValue({
      shelters,
      isLoading: false,
      loadError: null,
    });
    rerender();

    await waitFor(() => {
      expect(result.current.displayedShelters).toEqual([firstShelter]);
    });
    expect(shelterRenderer.renderShelterCircles).toHaveBeenLastCalledWith(expect.anything(), [
      firstShelter,
    ]);
    // A stable updater keeps the table's debounced filter sync from re-rendering the map on load.
    expect(result.current.updateColumnFilters).toBe(updateColumnFiltersWhileLoading);
  });

  it('keeps the full filtered list in the table when the map moves', async () => {
    const firstShelter = shelters[0];
    if (!firstShelter) {
      throw new Error('expected shelter fixture');
    }

    vi.spyOn(viewportFilter, 'filterSheltersWithinMap')
      .mockReturnValueOnce(shelters)
      .mockReturnValue([firstShelter]);

    const mapContainerRef = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useShelterMap(mapContainerRef));

    await waitFor(() => {
      expect(result.current.displayedShelters).toEqual(shelters);
    });

    const moveHandler = mockMap.on.mock.calls.find(
      (call: unknown[]) => call[0] === 'moveend',
    )?.[1] as (() => void) | undefined;
    if (typeof moveHandler !== 'function') {
      throw new Error('expected moveend handler');
    }

    act(() => {
      moveHandler();
    });

    expect(result.current.displayedShelters).toEqual(shelters);
    expect(shelterRenderer.renderShelterMarkers).toHaveBeenLastCalledWith(
      expect.anything(),
      [firstShelter],
      15,
    );
  });

  it('adds shelter layer groups to the map and removes them on unmount', async () => {
    const removeSpy = vi.spyOn(L.LayerGroup.prototype, 'remove');

    const mapContainerRef = createRef<HTMLDivElement>();
    const { result, unmount } = renderHook(() => useShelterMap(mapContainerRef));

    await waitFor(() => {
      expect(result.current.displayedShelters).toEqual(shelters);
    });

    const addedLayers = mockMap.addLayer.mock.calls.map((call: unknown[]) => call[0]);
    expect(addedLayers).toHaveLength(2);
    expect(addedLayers.every((layer: unknown) => layer instanceof L.LayerGroup)).toBe(true);
    expect(shelterRenderer.renderShelterCircles).toHaveBeenLastCalledWith(addedLayers[0], shelters);
    expect(shelterRenderer.renderShelterMarkers).toHaveBeenLastCalledWith(
      addedLayers[1],
      shelters,
      15,
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
    const { result } = renderHook(() => useShelterMap(mapContainerRef));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.loadError).toBe('network error');
    expect(result.current.displayedShelters).toEqual([]);
  });

  it('forwards tile layer changes to useLeafletMap', async () => {
    const mapContainerRef = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useShelterMap(mapContainerRef));

    await waitFor(() => {
      expect(result.current.displayedShelters).toEqual(shelters);
    });

    act(() => {
      result.current.changeTileLayer('gia_photo');
    });

    expect(changeTileLayer).toHaveBeenCalledWith('gia_photo');
  });
});
