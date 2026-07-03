import { describe, expect, it } from 'vitest'
import { createGeoJsonFeature } from '~/test/fixtures'
import { createShelterFromGeoJsonFeature } from '~/types/shelter'

describe('createShelterFromGeoJsonFeature', () => {
  it('maps GeoJSON properties to a shelter', () => {
    const shelter = createShelterFromGeoJsonFeature(createGeoJsonFeature())

    expect(shelter).toEqual({
      name: 'テスト避難所',
      address: '神奈川県横浜市',
      type: {
        flood: true,
        landslide: false,
        storm_surge: false,
        earthquake: true,
        tsunami: false,
        big_fire: false,
        flood_within_levee: false,
        volcanic_activity: false,
      },
      latitude: 35.4,
      longitude: 139.6,
      note: 'テスト備考',
    })
  })

  it('returns null when coordinates are invalid', () => {
    const feature = createGeoJsonFeature()
    feature.geometry.coordinates = [Number.NaN, 35.4]

    expect(createShelterFromGeoJsonFeature(feature)).toBeNull()
  })

  it('treats only "1" as designated for disaster types', () => {
    const shelter = createShelterFromGeoJsonFeature(
      createGeoJsonFeature({
        洪水: '0',
        津波: '2',
      }),
    )

    expect(shelter?.type.flood).toBe(false)
    expect(shelter?.type.tsunami).toBe(false)
  })
})
