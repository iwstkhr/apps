// @vitest-environment happy-dom

import { act, renderHook } from '@testing-library/react';
import type { Map as LeafletMap } from 'leaflet';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getGeolocationErrorMessage, useCurrentLocation } from '~/hooks/use-current-location';

const mockMap = {
  addLayer: vi.fn(),
  removeLayer: vi.fn(),
  flyTo: vi.fn(),
  getZoom: vi.fn(() => 8),
} as unknown as LeafletMap & { flyTo: ReturnType<typeof vi.fn> };

const getCurrentPosition = vi.fn();

function positionError(code: number): GeolocationPositionError {
  return { code, message: '', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 };
}

describe('useCurrentLocation', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
    getCurrentPosition.mockReset();
    mockMap.flyTo.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('flies to the current position', () => {
    getCurrentPosition.mockImplementation((onSuccess: PositionCallback) =>
      onSuccess({
        coords: { latitude: 35.5, longitude: 139.7, accuracy: 30 },
      } as GeolocationPosition),
    );
    const { result } = renderHook(() => useCurrentLocation({ current: mockMap }, true));

    act(() => result.current.locate());

    expect(mockMap.flyTo).toHaveBeenCalledWith([35.5, 139.7], 15);
    expect(result.current.isLocating).toBe(false);
    expect(result.current.locationError).toBeNull();
  });

  it('shows a message when the position cannot be read, and dismisses it', () => {
    getCurrentPosition.mockImplementation(
      (_onSuccess: PositionCallback, onError: PositionErrorCallback) => onError(positionError(1)),
    );
    const { result } = renderHook(() => useCurrentLocation({ current: mockMap }, true));

    act(() => result.current.locate());

    expect(result.current.locationError).toContain('位置情報の利用が許可されていません');
    expect(mockMap.flyTo).not.toHaveBeenCalled();

    act(() => result.current.dismissLocationError());
    expect(result.current.locationError).toBeNull();
  });

  it('reports browsers without geolocation', () => {
    vi.stubGlobal('navigator', {});
    const { result } = renderHook(() => useCurrentLocation({ current: mockMap }, true));

    act(() => result.current.locate());

    expect(result.current.locationError).toBe('このブラウザは位置情報に対応していません。');
  });
});

describe('getGeolocationErrorMessage', () => {
  it('distinguishes timeouts from other failures', () => {
    expect(getGeolocationErrorMessage(positionError(3))).toContain('タイムアウト');
    expect(getGeolocationErrorMessage(positionError(2))).toBe('現在地を取得できませんでした。');
  });
});
