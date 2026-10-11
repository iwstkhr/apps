import { useCallback, useEffect, useState } from 'react';
import { L } from '~/lib/leaflet';
import {
  CURRENT_LOCATION_ACCURACY_STYLE,
  CURRENT_LOCATION_MARKER_STYLE,
  CURRENT_LOCATION_ZOOM,
} from '~/lib/map/constants';
import { getMapFlyOptions } from '~/lib/map/fly-options';

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 60_000,
};

export function getGeolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return '位置情報の利用が許可されていません。ブラウザの設定を確認してください。';
    case error.TIMEOUT:
      return '現在地の取得がタイムアウトしました。もう一度お試しください。';
    default:
      return '現在地を取得できませんでした。';
  }
}

export function useCurrentLocation(mapRef: React.RefObject<L.Map | null>, mapReady: boolean) {
  const [layer] = useState(() => L.layerGroup());
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    layer.addTo(map);
    return () => {
      layer.remove();
    };
  }, [layer, mapReady, mapRef]);

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocationError('このブラウザは位置情報に対応していません。');
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setIsLocating(false);
        const map = mapRef.current;
        if (!map) {
          return;
        }

        const latLng: L.LatLngTuple = [coords.latitude, coords.longitude];
        layer.clearLayers();
        L.circle(latLng, { ...CURRENT_LOCATION_ACCURACY_STYLE, radius: coords.accuracy }).addTo(
          layer,
        );
        L.circleMarker(latLng, CURRENT_LOCATION_MARKER_STYLE)
          .bindTooltip('現在地', { direction: 'top', offset: [0, -8] })
          .addTo(layer);
        map.flyTo(latLng, Math.max(map.getZoom(), CURRENT_LOCATION_ZOOM), getMapFlyOptions());
      },
      (error) => {
        setIsLocating(false);
        setLocationError(getGeolocationErrorMessage(error));
      },
      GEOLOCATION_OPTIONS,
    );
  }, [layer, mapRef]);

  const dismissLocationError = useCallback(() => setLocationError(null), []);

  return { locate, isLocating, locationError, dismissLocationError };
}
