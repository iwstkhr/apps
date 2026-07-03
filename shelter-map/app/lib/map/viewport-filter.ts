import type { Map as LeafletMap } from 'leaflet'
import type { Shelter } from '~/types/shelter'

export function filterSheltersWithinMap(map: LeafletMap, shelters: Shelter[]): Shelter[] {
  const bounds = map.getBounds()
  return shelters.filter((shelter) => bounds.contains([shelter.latitude, shelter.longitude]))
}
