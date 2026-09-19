import { useState } from 'react';
import { useDebouncedCallback } from '~/hooks/use-debounced-callback';
import { useShelterMapContext } from '~/hooks/use-shelter-map-context';
import {
  DEFAULT_TILE_LAYER,
  TILE_LAYERS,
  type TileLayerKey,
  tileLayerKeys,
} from '~/types/tile-layer';

const DEBOUNCE_MS = 200;

export function MapTileLayerControl() {
  const { changeTileLayer } = useShelterMapContext();
  const [tileLayer, setTileLayer] = useState<TileLayerKey>(DEFAULT_TILE_LAYER);

  useDebouncedCallback(tileLayer, changeTileLayer, DEBOUNCE_MS);

  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="sr-only">地図タイル</legend>
      <div className="flex flex-col gap-1 text-xs text-slate-800 sm:inline-flex sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1 sm:text-sm">
        <span className="font-semibold text-slate-900">地図タイル</span>
        {tileLayerKeys.map((key) => (
          <label key={key} className="inline-flex cursor-pointer items-center gap-1">
            <input
              type="radio"
              name="tile_layer"
              value={key}
              checked={tileLayer === key}
              onChange={() => setTileLayer(key)}
              className="size-3.5"
            />
            {TILE_LAYERS[key].label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
