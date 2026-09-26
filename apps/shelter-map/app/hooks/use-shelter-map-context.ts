import { useContext } from 'react';
import { ShelterMapContext, type ShelterMapContextValue } from '~/context/shelter-map-context';

export function useShelterMapContext(): ShelterMapContextValue {
  const context = useContext(ShelterMapContext);
  if (!context) {
    throw new Error('useShelterMapContext must be used within ShelterMapProvider');
  }
  return context;
}
