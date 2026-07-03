import { useState } from 'react'
import { useDebouncedCallback } from '~/hooks/use-debounced-callback'
import { useShelterMapContext } from '~/hooks/use-shelter-map-context'
import type { TileLayerKey } from '~/types/tile-layer'

const DEBOUNCE_MS = 200

export function MapTileLayerControl() {
  const { changeTileLayer } = useShelterMapContext()
  const [tileLayer, setTileLayer] = useState<TileLayerKey>('osm')

  useDebouncedCallback(tileLayer, changeTileLayer, DEBOUNCE_MS)

  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="sr-only">地図タイル</legend>
      <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-800">
        <span className="font-semibold text-slate-900">地図タイル</span>
        <label className="inline-flex cursor-pointer items-center gap-1">
          <input
            type="radio"
            name="tile_layer"
            value="osm"
            checked={tileLayer === 'osm'}
            onChange={() => setTileLayer('osm')}
            className="size-3.5"
          />
          OpenStreetMap
        </label>
        <label className="inline-flex cursor-pointer items-center gap-1">
          <input
            type="radio"
            name="tile_layer"
            value="gia_photo"
            checked={tileLayer === 'gia_photo'}
            onChange={() => setTileLayer('gia_photo')}
            className="size-3.5"
          />
          国土地理院 (写真)
        </label>
      </div>
    </fieldset>
  )
}
