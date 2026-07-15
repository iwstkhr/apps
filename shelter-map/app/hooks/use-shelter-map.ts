import type { Circle, Marker } from 'leaflet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLeafletMap } from '~/hooks/use-leaflet-map';
import { useShelterData } from '~/hooks/use-shelter-data';
import {
  clearShelterCircles,
  clearShelterMarkers,
  renderShelterCircles,
  renderShelterMarkers,
} from '~/lib/map/shelter-renderer';
import { filterSheltersWithinMap } from '~/lib/map/viewport-filter';
import type { Shelter } from '~/types/shelter';
import {
  emptyShelterColumnFilters,
  filterSheltersByColumns,
  type ShelterColumnFilters,
} from '~/types/shelter-filters';

export function useShelterMap(mapContainerRef: React.RefObject<HTMLDivElement | null>) {
  const { mapRef, mapReady, changeTileLayer } = useLeafletMap(mapContainerRef);
  const { allSheltersRef, isLoading, loadError } = useShelterData();

  const shelterCirclesRef = useRef<Circle[]>([]);
  const shelterMarkersRef = useRef<Marker[]>([]);
  const filteredSheltersRef = useRef<Shelter[]>([]);
  const columnFiltersRef = useRef<ShelterColumnFilters>(emptyShelterColumnFilters);
  const [displayedShelters, setDisplayedShelters] = useState<Shelter[]>([]);

  const updateVisibleMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const visible = filterSheltersWithinMap(map, filteredSheltersRef.current);
    shelterMarkersRef.current = renderShelterMarkers(map, visible, shelterMarkersRef.current);
  }, [mapRef]);

  const applyColumnFilters = useCallback(
    (filters: ShelterColumnFilters) => {
      const map = mapRef.current;
      if (!map) {
        return;
      }

      columnFiltersRef.current = filters;
      const filtered = filterSheltersByColumns(allSheltersRef.current, filters);
      filteredSheltersRef.current = filtered;
      setDisplayedShelters(filtered);
      shelterCirclesRef.current = renderShelterCircles(map, filtered, shelterCirclesRef.current);

      const visible = filterSheltersWithinMap(map, filtered);
      shelterMarkersRef.current = renderShelterMarkers(map, visible, shelterMarkersRef.current);
    },
    [allSheltersRef, mapRef],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || isLoading || loadError) {
      return;
    }

    const shelters = allSheltersRef.current;
    filteredSheltersRef.current = shelters;
    setDisplayedShelters(shelters);
    shelterCirclesRef.current = renderShelterCircles(map, shelters, shelterCirclesRef.current);

    const visible = filterSheltersWithinMap(map, shelters);
    shelterMarkersRef.current = renderShelterMarkers(map, visible, shelterMarkersRef.current);
  }, [allSheltersRef, isLoading, loadError, mapReady, mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    const handleMapChange = () => updateVisibleMarkers();
    map.on('zoomlevelschange', handleMapChange);
    map.on('moveend', handleMapChange);

    return () => {
      map.off('zoomlevelschange', handleMapChange);
      map.off('moveend', handleMapChange);
    };
  }, [mapReady, mapRef, updateVisibleMarkers]);

  useEffect(() => {
    return () => {
      clearShelterCircles(shelterCirclesRef.current);
      shelterCirclesRef.current = [];
      clearShelterMarkers(shelterMarkersRef.current);
      shelterMarkersRef.current = [];
    };
  }, []);

  return {
    displayedShelters,
    isLoading,
    loadError,
    updateColumnFilters: applyColumnFilters,
    changeTileLayer,
  };
}
