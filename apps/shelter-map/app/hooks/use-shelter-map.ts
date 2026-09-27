import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLeafletMap } from '~/hooks/use-leaflet-map';
import { useShelterData } from '~/hooks/use-shelter-data';
import { L } from '~/lib/leaflet';
import { createShelterLayerRegistry, syncShelterLayers } from '~/lib/map/shelter-renderer';
import { filterSheltersWithinMap } from '~/lib/map/viewport-filter';
import {
  emptyShelterColumnFilters,
  filterSheltersByColumns,
  type ShelterColumnFilters,
} from '~/types/shelter-filters';

export function useShelterMap(mapContainerRef: React.RefObject<HTMLDivElement | null>) {
  const { mapRef, mapReady, changeTileLayer } = useLeafletMap(mapContainerRef);
  const { shelters, isLoading, loadError } = useShelterData();

  const [shelterLayers] = useState(() => ({
    group: L.layerGroup(),
    registry: createShelterLayerRegistry(),
  }));
  // Filters are kept even before data loads, so the first render after loading applies them.
  const [columnFilters, setColumnFilters] =
    useState<ShelterColumnFilters>(emptyShelterColumnFilters);

  const displayedShelters = useMemo(
    () => filterSheltersByColumns(shelters, columnFilters),
    [shelters, columnFilters],
  );

  const updateVisibleShelters = useCallback(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const visible = filterSheltersWithinMap(map, displayedShelters);
    syncShelterLayers(shelterLayers.group, shelterLayers.registry, visible, map.getZoom());
  }, [displayedShelters, mapRef, shelterLayers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    shelterLayers.group.addTo(map);

    return () => {
      shelterLayers.group.remove();
    };
  }, [mapReady, mapRef, shelterLayers]);

  useEffect(() => {
    if (!mapReady) {
      return;
    }

    updateVisibleShelters();
  }, [mapReady, updateVisibleShelters]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    map.on('zoomlevelschange', updateVisibleShelters);
    map.on('moveend', updateVisibleShelters);

    return () => {
      map.off('zoomlevelschange', updateVisibleShelters);
      map.off('moveend', updateVisibleShelters);
    };
  }, [mapReady, mapRef, updateVisibleShelters]);

  return {
    displayedShelters,
    isLoading,
    loadError,
    updateColumnFilters: setColumnFilters,
    changeTileLayer,
  };
}
