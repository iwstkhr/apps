import { useEffect, useMemo, useState } from 'react';
import { useLeafletMap } from '~/hooks/use-leaflet-map';
import { useShelterData } from '~/hooks/use-shelter-data';
import { L } from '~/lib/leaflet';
import { createShelterLayerRegistry, syncShelterLayers } from '~/lib/map/shelter-renderer';
import { filterSheltersWithinMap } from '~/lib/map/viewport-filter';
import { filterShelters, type ShelterFilters } from '~/types/shelter-filters';

export function useShelterMap(
  mapContainerRef: React.RefObject<HTMLDivElement | null>,
  filters: ShelterFilters,
) {
  const { mapRef, mapReady, changeTileLayer } = useLeafletMap(mapContainerRef);
  const { shelters, isLoading, loadError } = useShelterData();

  const [shelterLayers] = useState(() => ({
    group: L.layerGroup(),
    registry: createShelterLayerRegistry(),
  }));
  const displayedShelters = useMemo(() => filterShelters(shelters, filters), [shelters, filters]);

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
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    const updateVisibleShelters = () => {
      const visible = filterSheltersWithinMap(map, displayedShelters);
      syncShelterLayers(
        shelterLayers.group,
        shelterLayers.registry,
        visible,
        map.getZoom(),
        filters.types,
      );
    };

    updateVisibleShelters();
    map.on('zoomlevelschange', updateVisibleShelters);
    map.on('moveend', updateVisibleShelters);

    return () => {
      map.off('zoomlevelschange', updateVisibleShelters);
      map.off('moveend', updateVisibleShelters);
    };
  }, [displayedShelters, filters.types, mapReady, mapRef, shelterLayers]);

  return {
    displayedShelters,
    isLoading,
    loadError,
    changeTileLayer,
  };
}
