import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLeafletMap } from '~/hooks/use-leaflet-map';
import { useShelterData } from '~/hooks/use-shelter-data';
import { L } from '~/lib/leaflet';
import { renderShelterCircles, renderShelterMarkers } from '~/lib/map/shelter-renderer';
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
    circles: L.layerGroup(),
    markers: L.layerGroup(),
  }));
  // Filters are kept even before data loads, so the first render after loading applies them.
  const [columnFilters, setColumnFilters] =
    useState<ShelterColumnFilters>(emptyShelterColumnFilters);

  const displayedShelters = useMemo(
    () => filterSheltersByColumns(shelters, columnFilters),
    [shelters, columnFilters],
  );

  const updateVisibleMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const visible = filterSheltersWithinMap(map, displayedShelters);
    renderShelterMarkers(shelterLayers.markers, visible, map.getZoom());
  }, [displayedShelters, mapRef, shelterLayers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    shelterLayers.circles.addTo(map);
    shelterLayers.markers.addTo(map);

    return () => {
      shelterLayers.circles.remove();
      shelterLayers.markers.remove();
    };
  }, [mapReady, mapRef, shelterLayers]);

  useEffect(() => {
    if (!mapReady) {
      return;
    }

    renderShelterCircles(shelterLayers.circles, displayedShelters);
    updateVisibleMarkers();
  }, [displayedShelters, mapReady, shelterLayers, updateVisibleMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    map.on('zoomlevelschange', updateVisibleMarkers);
    map.on('moveend', updateVisibleMarkers);

    return () => {
      map.off('zoomlevelschange', updateVisibleMarkers);
      map.off('moveend', updateVisibleMarkers);
    };
  }, [mapReady, mapRef, updateVisibleMarkers]);

  return {
    displayedShelters,
    isLoading,
    loadError,
    updateColumnFilters: setColumnFilters,
    changeTileLayer,
  };
}
