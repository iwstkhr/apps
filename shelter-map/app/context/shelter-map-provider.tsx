import { useRef } from 'react'
import { ShelterMapContext } from '~/context/shelter-map-context'
import { useShelterMap } from '~/hooks/use-shelter-map'

export function ShelterMapProvider({ children }: { children: React.ReactNode }) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const { displayedShelters, isLoading, loadError, updateColumnFilters, changeTileLayer } =
    useShelterMap(mapContainerRef)

  return (
    <ShelterMapContext.Provider
      value={{
        mapContainerRef,
        displayedShelters,
        isLoading,
        loadError,
        updateColumnFilters,
        changeTileLayer,
      }}
    >
      {children}
    </ShelterMapContext.Provider>
  )
}
