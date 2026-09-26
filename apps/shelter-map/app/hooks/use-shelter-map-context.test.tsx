// @vitest-environment happy-dom

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShelterMapContext } from '~/context/shelter-map-context';
import { useShelterMapContext } from '~/hooks/use-shelter-map-context';
import { createShelterMapContextValue } from '~/test/render-with-shelter-map';

describe('useShelterMapContext', () => {
  it('throws when used outside ShelterMapProvider', () => {
    expect(() => renderHook(() => useShelterMapContext())).toThrow(
      'useShelterMapContext must be used within ShelterMapProvider',
    );
  });

  it('returns the context value inside ShelterMapProvider', () => {
    const contextValue = createShelterMapContextValue();
    const { result } = renderHook(() => useShelterMapContext(), {
      wrapper: ({ children }) => (
        <ShelterMapContext.Provider value={contextValue}>{children}</ShelterMapContext.Provider>
      ),
    });

    expect(result.current).toBe(contextValue);
  });
});
