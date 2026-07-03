import type { Shelter } from '~/types/shelter'
import { ShelterTypeJapanese, shelterTypeKeys } from '~/types/shelter-type'

export function getPopupContent(shelter: Shelter): string {
  let popup = `<strong>${shelter.name}</strong><br/>${shelter.address}<hr class="shelter-popup-divider"/>`

  popup += shelterTypeKeys
    .map((key) => {
      const ready = shelter.type[key]
      const name = ShelterTypeJapanese.get(key)
      return ready
        ? `<span class="app-content-ready shelter-type-ready">${name}</span>`
        : `<span class="app-content-not-ready shelter-type-not-ready">${name}</span>`
    })
    .join('<br/>')

  return popup
}
