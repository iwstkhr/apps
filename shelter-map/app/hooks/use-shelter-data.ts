import { useEffect, useRef, useState } from 'react';
import { fetchShelters } from '~/data/fetch-shelters';
import type { Shelter } from '~/types/shelter';

export function useShelterData() {
  const allSheltersRef = useRef<Shelter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchShelters()
      .then((shelters) => {
        if (cancelled) {
          return;
        }

        allSheltersRef.current = shelters;
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setLoadError(error instanceof Error ? error.message : 'データの読み込みに失敗しました');
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { allSheltersRef, isLoading, loadError };
}
