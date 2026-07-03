import { useCallback, useEffect, useRef, useState } from 'react'
import { bindModifierScrollWheelZoom, L } from '~/lib/leaflet'
import { INITIAL_ZOOM, MAP_CENTER } from '~/lib/map/constants'
import type { TileLayerKey } from '~/types/tile-layer'

export function useLeafletMap(mapContainerRef: React.RefObject<HTMLDivElement | null>) {
  const mapRef = useRef<L.Map | null>(null)
  const tileLayerOsmRef = useRef<L.TileLayer | null>(null)
  const tileLayerGiaPhotoRef = useRef<L.TileLayer | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const changeTileLayer = useCallback((tileLayer: TileLayerKey) => {
    const map = mapRef.current
    const tileLayerOsm = tileLayerOsmRef.current
    const tileLayerGiaPhoto = tileLayerGiaPhotoRef.current

    if (!map || !tileLayerOsm || !tileLayerGiaPhoto) {
      return
    }

    tileLayerOsm.remove()
    tileLayerGiaPhoto.remove()

    if (tileLayer === 'osm') {
      map.addLayer(tileLayerOsm)
    } else {
      map.addLayer(tileLayerGiaPhoto)
    }
  }, [])

  useEffect(() => {
    const container = mapContainerRef.current
    if (!container) {
      return
    }

    const map = L.map(container, {
      preferCanvas: true,
      scrollWheelZoom: false,
      zoomControl: true,
    }).setView(MAP_CENTER, INITIAL_ZOOM)
    mapRef.current = map
    setMapReady(true)
    const unbindModifierScrollWheelZoom = bindModifierScrollWheelZoom(map)

    tileLayerOsmRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      minZoom: 5,
      maxZoom: 18,
      attribution: '© OpenStreetMap',
    })
    tileLayerGiaPhotoRef.current = L.tileLayer(
      'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg',
      {
        minZoom: 5,
        maxZoom: 18,
        attribution: '© 国土地理院',
      },
    )

    map.addLayer(tileLayerOsmRef.current)

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize()
    })
    resizeObserver.observe(container)

    return () => {
      setMapReady(false)
      resizeObserver.disconnect()
      unbindModifierScrollWheelZoom()
      map.remove()
      mapRef.current = null
      tileLayerOsmRef.current = null
      tileLayerGiaPhotoRef.current = null
    }
  }, [mapContainerRef])

  return { mapRef, mapReady, changeTileLayer }
}
