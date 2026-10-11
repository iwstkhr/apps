import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCurrentLocation } from '~/hooks/use-current-location';
import { useLeafletMap } from '~/hooks/use-leaflet-map';
import { useShelterData } from '~/hooks/use-shelter-data';
import { L } from '~/lib/leaflet';
import { SHELTER_FOCUS_MIN_ZOOM } from '~/lib/map/constants';
import {
  createShelterLayerRegistry,
  findShelterIdByLayer,
  syncShelterLayers,
} from '~/lib/map/shelter-renderer';
import { filterSheltersWithinMap } from '~/lib/map/viewport-filter';
import type { Shelter } from '~/types/shelter';
import { filterShelters, type ShelterFilters } from '~/types/shelter-filters';

export function useShelterMap(
  mapContainerRef: React.RefObject<HTMLDivElement | null>,
  filters: ShelterFilters,
) {
  const { mapRef, mapReady, changeTileLayer } = useLeafletMap(mapContainerRef);
  const { shelters, isLoading, loadError } = useShelterData();
  const currentLocation = useCurrentLocation(mapRef, mapReady);

  // A feature group so popup events from each shelter layer bubble up to one listener.
  const [shelterLayers] = useState(() => ({
    group: L.featureGroup(),
    registry: createShelterLayerRegistry(),
  }));
  const displayedShelters = useMemo(() => filterShelters(shelters, filters), [shelters, filters]);
  const [visibleShelters, setVisibleShelters] = useState<Shelter[]>([]);
  const [selectedShelterId, setSelectedShelterId] = useState<Shelter['id'] | null>(null);
  // The shelter whose popup opens once the map finishes moving to it.
  const pendingFocusIdRef = useRef<Shelter['id'] | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    shelterLayers.group.addTo(map);

    let openPopup: { popup: L.Popup; shelterId: Shelter['id'] } | null = null;
    const handlePopupOpen = (event: L.LeafletEvent) => {
      const { layer, popup } = event as L.PopupEvent & { layer?: L.Layer };
      const shelterId = layer && findShelterIdByLayer(shelterLayers.registry, layer);
      if (shelterId) {
        openPopup = { popup, shelterId };
        setSelectedShelterId(shelterId);
      }
    };
    // Listen on the map: a layer removed while zooming closes its popup after leaving the group.
    const handlePopupClose = (event: L.PopupEvent) => {
      if (openPopup?.popup !== event.popup) {
        return;
      }
      const { shelterId } = openPopup;
      openPopup = null;
      setSelectedShelterId((current) => (current === shelterId ? null : current));
    };

    shelterLayers.group.on('popupopen', handlePopupOpen);
    map.on('popupclose', handlePopupClose);

    return () => {
      shelterLayers.group.off('popupopen', handlePopupOpen);
      map.off('popupclose', handlePopupClose);
      shelterLayers.group.remove();
    };
  }, [mapReady, mapRef, shelterLayers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    const updateVisibleShelters = () => {
      // A hidden map (the list tab on phones) has no size; keep the last viewport instead.
      const size = map.getSize();
      if (size.x === 0 || size.y === 0) {
        return;
      }

      const visible = filterSheltersWithinMap(map, displayedShelters);
      setVisibleShelters(visible);
      syncShelterLayers(
        shelterLayers.group,
        shelterLayers.registry,
        visible,
        map.getZoom(),
        filters.types,
      );

      const pendingFocusId = pendingFocusIdRef.current;
      if (pendingFocusId) {
        pendingFocusIdRef.current = null;
        shelterLayers.registry.get(pendingFocusId)?.layer.openPopup();
      }
    };

    updateVisibleShelters();
    map.on('zoomlevelschange', updateVisibleShelters);
    map.on('moveend', updateVisibleShelters);

    return () => {
      map.off('zoomlevelschange', updateVisibleShelters);
      map.off('moveend', updateVisibleShelters);
    };
  }, [displayedShelters, filters.types, mapReady, mapRef, shelterLayers]);

  const focusShelter = useCallback(
    (shelter: Shelter) => {
      const map = mapRef.current;
      if (!map) {
        return;
      }

      pendingFocusIdRef.current = shelter.id;
      setSelectedShelterId(shelter.id);
      map.flyTo(
        [shelter.latitude, shelter.longitude],
        Math.max(map.getZoom(), SHELTER_FOCUS_MIN_ZOOM),
      );
    },
    [mapRef],
  );

  return {
    displayedShelters,
    visibleShelters,
    selectedShelterId,
    focusShelter,
    isLoading,
    loadError,
    changeTileLayer,
    ...currentLocation,
  };
}
