import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
})

export function bindModifierScrollWheelZoom(map: L.Map): () => void {
  map.scrollWheelZoom.disable()

  const container = map.getContainer()
  const handleWheel = (event: WheelEvent) => {
    if (!(event.ctrlKey || event.metaKey)) {
      return
    }

    event.preventDefault()

    const delta = event.deltaY
    if (delta === 0) {
      return
    }

    const zoom = map.getZoom()
    const nextZoom = delta > 0 ? zoom - 1 : zoom + 1
    if (nextZoom < map.getMinZoom() || nextZoom > map.getMaxZoom()) {
      return
    }

    const point = map.mouseEventToContainerPoint(event)
    map.setZoomAround(point, nextZoom)
  }

  container.addEventListener('wheel', handleWheel, { passive: false })
  return () => container.removeEventListener('wheel', handleWheel)
}

export { L }
