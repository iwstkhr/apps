import {
  DEFAULT_TILE_LAYER,
  TILE_LAYERS,
  type TileLayerKey,
  tileLayerKeys,
} from '~/types/tile-layer';

export function MapTileLayerControl({ onChange }: { onChange: (tileLayer: TileLayerKey) => void }) {
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
              defaultChecked={key === DEFAULT_TILE_LAYER}
              onChange={() => onChange(key)}
              className="size-3.5"
            />
            {TILE_LAYERS[key].label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
