// @vitest-environment happy-dom

import { cleanup, fireEvent, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MapTileLayerControl } from '~/components/map/map-tile-layer-control';
import { renderWithShelterMap } from '~/test/render-with-shelter-map';

describe('MapTileLayerControl', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders tile layer options with OpenStreetMap selected by default', () => {
    const { container } = renderWithShelterMap(<MapTileLayerControl />);
    const fieldset = within(container).getByRole('group', { name: '地図タイル' });

    expect(within(fieldset).getByRole('radio', { name: /OpenStreetMap/i })).toBeChecked();
    expect(within(fieldset).getByRole('radio', { name: /国土地理院 \(写真\)/i })).not.toBeChecked();
  });

  it('debounces tile layer changes before notifying the map', () => {
    const { container, contextValue } = renderWithShelterMap(<MapTileLayerControl />);
    const fieldset = within(container).getByRole('group', { name: '地図タイル' });

    fireEvent.click(within(fieldset).getByRole('radio', { name: /国土地理院 \(写真\)/i }));

    expect(contextValue.changeTileLayer).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);

    expect(contextValue.changeTileLayer).toHaveBeenCalledOnce();
    expect(contextValue.changeTileLayer).toHaveBeenCalledWith('gia_photo');
  });
});
