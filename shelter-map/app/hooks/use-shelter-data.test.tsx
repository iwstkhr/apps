// @vitest-environment happy-dom

import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchShelters } from '~/data/fetch-shelters'
import { useShelterData } from '~/hooks/use-shelter-data'
import { createShelter } from '~/test/fixtures'

vi.mock('~/data/fetch-shelters', () => ({
  fetchShelters: vi.fn(),
}))

describe('useShelterData', () => {
  beforeEach(() => {
    vi.mocked(fetchShelters).mockReset()
  })

  it('loads shelters and clears the loading state', async () => {
    const shelters = [createShelter(), createShelter({ name: '第二避難所' })]
    vi.mocked(fetchShelters).mockResolvedValue(shelters)

    const { result } = renderHook(() => useShelterData())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.loadError).toBeNull()

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.allSheltersRef.current).toEqual(shelters)
    expect(result.current.loadError).toBeNull()
  })

  it('stores an error message when loading fails', async () => {
    vi.mocked(fetchShelters).mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useShelterData())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.loadError).toBe('network error')
    expect(result.current.allSheltersRef.current).toEqual([])
  })
})
