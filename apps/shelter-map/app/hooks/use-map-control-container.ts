import { useEffect, useState } from 'react';
import { L } from '~/lib/leaflet';

/**
 * Adds an empty Leaflet control and returns its element, so React can portal UI into it. Controls
 * in the same corner stack instead of overlapping, e.g. above the attribution however it wraps.
 */
export function useMapControlContainer(
  mapRef: React.RefObject<L.Map | null>,
  mapReady: boolean,
  position: L.ControlPosition,
): HTMLElement | null {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    const control = new L.Control({ position });
    control.onAdd = () => {
      const element = L.DomUtil.create('div');
      // Clicks and wheel events on the control must not pan or zoom the map.
      L.DomEvent.disableClickPropagation(element);
      L.DomEvent.disableScrollPropagation(element);
      return element;
    };
    control.addTo(map);
    setContainer(control.getContainer() ?? null);

    return () => {
      control.remove();
      setContainer(null);
    };
  }, [mapRef, mapReady, position]);

  return container;
}
