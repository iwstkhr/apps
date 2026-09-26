import { useEffect, useState } from 'react';
import { useDebouncedValueEffect } from '~/hooks/use-debounced-value-effect';
import {
  emptyShelterColumnFilters,
  type ShelterColumnFilters,
  type ShelterFilterColumnId,
} from '~/types/shelter-filters';

const DEBOUNCE_MS = 200;

export function useShelterTableFilters(
  updateColumnFilters: (filters: ShelterColumnFilters) => void,
) {
  const [draftFilters, setDraftFilters] = useState<ShelterColumnFilters>(emptyShelterColumnFilters);
  const [openFilterColumn, setOpenFilterColumn] = useState<ShelterFilterColumnId | null>(null);

  useDebouncedValueEffect(draftFilters, updateColumnFilters, DEBOUNCE_MS);

  useEffect(() => {
    if (!openFilterColumn) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        !target.closest('[data-filter-toggle], [data-filter-popover]')
      ) {
        setOpenFilterColumn(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [openFilterColumn]);

  const toggleFilterColumn = (columnId: ShelterFilterColumnId) => {
    setOpenFilterColumn((current) => (current === columnId ? null : columnId));
  };

  return { draftFilters, openFilterColumn, setDraftFilters, toggleFilterColumn };
}
