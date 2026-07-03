import { type RenderOptions, render } from '@testing-library/react'
import { createRef, type ReactElement } from 'react'
import { vi } from 'vitest'
import { ShelterMapContext, type ShelterMapContextValue } from '~/context/shelter-map-context'
import { createShelter } from '~/test/fixtures'

export function createShelterMapContextValue(
  overrides: Partial<ShelterMapContextValue> = {},
): ShelterMapContextValue {
  return {
    mapContainerRef: createRef<HTMLDivElement>(),
    displayedShelters: [createShelter()],
    isLoading: false,
    loadError: null,
    updateColumnFilters: vi.fn(),
    changeTileLayer: vi.fn(),
    ...overrides,
  }
}

export function renderWithShelterMap(
  ui: ReactElement,
  overrides: Partial<ShelterMapContextValue> = {},
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  const contextValue = createShelterMapContextValue(overrides)

  return {
    contextValue,
    ...render(ui, {
      wrapper: ({ children }) => (
        <ShelterMapContext.Provider value={contextValue}>{children}</ShelterMapContext.Provider>
      ),
      ...options,
    }),
  }
}
