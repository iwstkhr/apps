// @vitest-environment happy-dom

import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useMapControlContainer } from '~/hooks/use-map-control-container';
import { L } from '~/lib/leaflet';

describe('useMapControlContainer', () => {
  let map: L.Map | null = null;

  afterEach(() => {
    map?.remove();
    map = null;
  });

  it('adds a control above the attribution in the same corner and removes it on unmount', () => {
    const element = document.createElement('div');
    document.body.append(element);
    map = L.map(element).setView([35.4, 139.6], 8);
    const mapRef = { current: map };

    const { result, unmount } = renderHook(() =>
      useMapControlContainer(mapRef, true, 'bottomright'),
    );

    const container = result.current;
    expect(container).toHaveClass('leaflet-control');
    const corner = element.querySelector('.leaflet-bottom.leaflet-right');
    // Bottom corners stack new controls before the existing ones, so it sits above the attribution
    expect(corner?.firstElementChild).toBe(container);
    expect(corner?.lastElementChild).toHaveClass('leaflet-control-attribution');

    unmount();
    expect(container?.isConnected).toBe(false);
  });

  it('waits until the map is ready', () => {
    const { result } = renderHook(() =>
      useMapControlContainer({ current: null }, false, 'topleft'),
    );
    expect(result.current).toBeNull();
  });
});
