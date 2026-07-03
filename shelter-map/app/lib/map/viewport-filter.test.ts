import type { Map as LeafletMap } from 'leaflet'
import { describe, expect, it } from 'vitest'
import { filterSheltersWithinMap } from '~/lib/map/viewport-filter'
import { createShelter } from '~/test/fixtures'

function createMapContaining(bounds: {
  south: number
  north: number
  west: number
  east: number
}): LeafletMap {
  return {
    getBounds: () => ({
      contains: ([latitude, longitude]: [number, number]) =>
        latitude >= bounds.south &&
        latitude <= bounds.north &&
        longitude >= bounds.west &&
        longitude <= bounds.east,
    }),
  } as LeafletMap
}

const shelters = [
  createShelter({ name: '範囲内', latitude: 35.4, longitude: 139.6 }),
  createShelter({ name: '範囲外', latitude: 43.0, longitude: 141.3, address: '北海道' }),
]

describe('filterSheltersWithinMap', () => {
  it('returns only shelters within map bounds', () => {
    const map = createMapContaining({ south: 35, north: 36, west: 139, east: 140 })

    expect(filterSheltersWithinMap(map, shelters)).toEqual([shelters[0]])
  })
})
