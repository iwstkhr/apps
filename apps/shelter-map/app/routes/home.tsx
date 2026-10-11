import { useId, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ShelterFilterBar } from '~/components/filter/shelter-filter-bar';
import { type MobileView, ViewTabs } from '~/components/layout/view-tabs';
import { CurrentLocationButton } from '~/components/map/current-location-button';
import { ListPanelToggle } from '~/components/map/list-panel-toggle';
import { MapAlert } from '~/components/map/map-alert';
import { MapHelpHint } from '~/components/map/map-help-hint';
import { MapTileLayerControl } from '~/components/map/map-tile-layer-control';
import { ShelterDataLoadingOverlay } from '~/components/map/shelter-data-loading-overlay';
import { MapTable } from '~/components/table/map-table';
import { useDebouncedValue } from '~/hooks/use-debounced-value';
import { LG_MEDIA_QUERY, SM_MEDIA_QUERY, useMediaQuery } from '~/hooks/use-media-query';
import { useShelterMap } from '~/hooks/use-shelter-map';
import { cn } from '~/lib/cn';
import type { Shelter } from '~/types/shelter';
import { emptyShelterFilters, type ShelterFilters } from '~/types/shelter-filters';
import type { Route } from './+types/home';

export function meta(_args: Route.MetaArgs) {
  return [{ title: '指定緊急避難場所マップ' }];
}

const KEYWORD_DEBOUNCE_MS = 200;

export default function Home() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<ShelterFilters>(emptyShelterFilters);
  // Only typing is debounced; chip and checkbox changes apply immediately.
  const debouncedKeyword = useDebouncedValue(filters.keyword, KEYWORD_DEBOUNCE_MS);
  const appliedFilters = useMemo(
    () => ({ ...filters, keyword: debouncedKeyword }),
    [filters, debouncedKeyword],
  );
  const {
    displayedShelters,
    visibleShelters,
    selectedShelterId,
    focusShelter,
    isLoading,
    loadError,
    changeTileLayer,
    locate,
    isLocating,
    locationError,
    dismissLocationError,
  } = useShelterMap(mapContainerRef, appliedFilters);
  const [mobileView, setMobileView] = useState<MobileView>('map');
  const [listCollapsed, setListCollapsed] = useState(false);
  const listPanelId = useId();
  const isSm = useMediaQuery(SM_MEDIA_QUERY, true);
  const isLg = useMediaQuery(LG_MEDIA_QUERY);
  // Phones show one tab at a time, tablets stack both, and wide screens can collapse the list.
  const listVisible = isLg ? !listCollapsed : isSm || mobileView === 'list';

  const selectShelter = (shelter: Shelter) => {
    // On phones the map may be hidden behind the list tab; show it before flying to the shelter.
    flushSync(() => setMobileView('map'));
    focusShelter(shelter);
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <ShelterFilterBar filters={filters} onChange={setFilters} />
      <ViewTabs
        view={mobileView}
        listCount={filters.withinMapOnly ? visibleShelters.length : displayedShelters.length}
        onChange={setMobileView}
      />

      {loadError && (
        <div className="shrink-0 text-right text-sm font-medium text-red-700">{loadError}</div>
      )}

      {/* Stacked below lg; on lg the list sits left of the map (row-reverse keeps the map first). */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 lg:flex-row-reverse lg:gap-3">
        <div
          className={cn(
            'relative z-0 min-h-0 min-w-0 w-full flex-[5] overflow-hidden rounded-md lg:flex-1',
            mobileView !== 'map' && 'hidden sm:block',
          )}
        >
          <div ref={mapContainerRef} className="h-full w-full" />
          {isLoading && <ShelterDataLoadingOverlay />}
          <div className="absolute top-2 right-2 z-[1000] sm:top-3 sm:right-3">
            <MapTileLayerControl onChange={changeTileLayer} />
          </div>
          <MapHelpHint />
          <ListPanelToggle
            expanded={!listCollapsed}
            controls={listPanelId}
            onToggle={() => setListCollapsed((collapsed) => !collapsed)}
          />
          <CurrentLocationButton isLocating={isLocating} onClick={locate} />
          {locationError && <MapAlert message={locationError} onDismiss={dismissLocationError} />}
        </div>

        <div
          id={listPanelId}
          className={cn(
            'min-h-0 min-w-0 flex-[4] flex-col lg:w-96 lg:flex-none',
            mobileView === 'list' ? 'flex' : 'hidden sm:flex',
            listCollapsed && 'lg:hidden',
          )}
        >
          <MapTable
            shelters={displayedShelters}
            visibleShelters={visibleShelters}
            withinMapOnly={filters.withinMapOnly}
            onWithinMapOnlyChange={(withinMapOnly) => setFilters({ ...filters, withinMapOnly })}
            selectedShelterId={selectedShelterId}
            onSelect={selectShelter}
            visible={listVisible}
          />
        </div>
      </div>
    </section>
  );
}
