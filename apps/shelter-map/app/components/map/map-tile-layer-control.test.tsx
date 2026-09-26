// @vitest-environment happy-dom

import { cleanup, fireEvent, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MapTileLayerControl } from '~/components/map/map-tile-layer-control';
import { renderWithShelterMap } from '~/test/render-with-shelter-map';
import { TILE_LAYERS, tileLayerKeys } from '~/types/tile-layer';

describe('MapTileLayerControl', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders tile layer options with OpenStreetMap selected by default', () => {
    const { container } = renderWithShelterMap(<MapTileLayerControl />);
    const fieldset = within(container).getByRole('group', { name: '地図タイル' });

    expect(within(fieldset).getByRole('radio', { name: /OpenStreetMap/i })).toBeChecked();
    expect(within(fieldset).getByRole('radio', { name: /国土地理院 \(写真\)/i })).not.toBeChecked();
  });

  it('renders one radio per tile layer definition', () => {
    const { container } = renderWithShelterMap(<MapTileLayerControl />);
    const radios = within(container).getAllByRole('radio');

    expect(radios.map((radio) => (radio as HTMLInputElement).value)).toEqual(tileLayerKeys);
    for (const key of tileLayerKeys) {
      expect(within(container).getByRole('radio', { name: TILE_LAYERS[key].label })).toBeTruthy();
    }
  });

  it('notifies the map immediately when the tile layer changes', () => {
    const { container, contextValue } = renderWithShelterMap(<MapTileLayerControl />);
    const fieldset = within(container).getByRole('group', { name: '地図タイル' });

    fireEvent.click(within(fieldset).getByRole('radio', { name: /国土地理院 \(写真\)/i }));

    expect(contextValue.changeTileLayer).toHaveBeenCalledOnce();
    expect(contextValue.changeTileLayer).toHaveBeenCalledWith('gia_photo');
  });
});
