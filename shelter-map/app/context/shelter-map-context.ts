import { createContext } from 'react'
import type { Shelter } from '~/types/shelter'
import type { ShelterColumnFilters } from '~/types/shelter-filters'
import type { TileLayerKey } from '~/types/tile-layer'

export interface ShelterMapContextValue {
  mapContainerRef: React.RefObject<HTMLDivElement | null>
  displayedShelters: Shelter[]
  isLoading: boolean
  loadError: string | null
  updateColumnFilters: (filters: ShelterColumnFilters) => void
  changeTileLayer: (tileLayer: TileLayerKey) => void
}

export const ShelterMapContext = createContext<ShelterMapContextValue | null>(null)
