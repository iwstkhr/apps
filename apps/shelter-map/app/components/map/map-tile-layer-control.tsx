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
      <div className="flex rounded-md border border-slate-300 bg-white p-0.5 shadow-md">
        {tileLayerKeys.map((key) => (
          <label
            key={key}
            title={TILE_LAYERS[key].label}
            className="cursor-pointer rounded px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 has-checked:bg-slate-800 has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-blue-600 sm:text-sm"
          >
            <input
              type="radio"
              name="tile_layer"
              value={key}
              defaultChecked={key === DEFAULT_TILE_LAYER}
              onChange={() => onChange(key)}
              className="sr-only"
            />
            {TILE_LAYERS[key].shortLabel}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
