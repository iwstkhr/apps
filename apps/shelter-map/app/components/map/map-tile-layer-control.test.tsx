// @vitest-environment happy-dom

import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MapTileLayerControl } from '~/components/map/map-tile-layer-control';
import { TILE_LAYERS, tileLayerKeys } from '~/types/tile-layer';

describe('MapTileLayerControl', () => {
  it('renders tile layer options with OpenStreetMap selected by default', () => {
    const { container } = render(<MapTileLayerControl onChange={vi.fn()} />);
    const fieldset = within(container).getByRole('group', { name: '地図タイル' });

    expect(within(fieldset).getByRole('radio', { name: /OpenStreetMap/i })).toBeChecked();
    expect(within(fieldset).getByRole('radio', { name: /国土地理院 \(写真\)/i })).not.toBeChecked();
  });

  it('renders one radio per tile layer definition', () => {
    const { container } = render(<MapTileLayerControl onChange={vi.fn()} />);
    const radios = within(container).getAllByRole('radio');

    expect(radios.map((radio) => (radio as HTMLInputElement).value)).toEqual(tileLayerKeys);
    for (const key of tileLayerKeys) {
      expect(within(container).getByRole('radio', { name: TILE_LAYERS[key].label })).toBeTruthy();
    }
  });

  it('notifies the map immediately when the tile layer changes', () => {
    const onChange = vi.fn();
    const { container } = render(<MapTileLayerControl onChange={onChange} />);
    const fieldset = within(container).getByRole('group', { name: '地図タイル' });

    fireEvent.click(within(fieldset).getByRole('radio', { name: /国土地理院 \(写真\)/i }));

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('gia_photo');
  });
});
