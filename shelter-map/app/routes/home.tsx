import { MapHelpHint } from '~/components/map/map-help-hint';
import { MapTileLayerControl } from '~/components/map/map-tile-layer-control';
import { MapTable } from '~/components/table/map-table';
import { ShelterMapProvider } from '~/context/shelter-map-provider';
import { useShelterMapContext } from '~/hooks/use-shelter-map-context';
import type { Route } from './+types/home';

export function meta(_args: Route.MetaArgs) {
  return [{ title: '指定緊急避難場所マップ' }];
}

function HomeContent() {
  const { mapContainerRef, isLoading, loadError } = useShelterMapContext();

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      {(isLoading || loadError) && (
        <div className="shrink-0 text-right text-sm font-medium text-slate-700">
          {isLoading ? (
            <span>データを読み込み中...</span>
          ) : (
            <span className="text-red-700">{loadError}</span>
          )}
        </div>
      )}

      <div className="relative z-0 min-h-0 min-w-0 w-full flex-[5] overflow-hidden rounded-md">
        <div ref={mapContainerRef} className="h-full w-full" />
        <div className="pointer-events-none absolute top-2 right-2 z-[1000] max-w-[min(100%-1rem,20rem)] sm:top-3 sm:right-3 sm:max-w-none">
          <div className="pointer-events-auto rounded-md border border-slate-300 bg-white px-2.5 py-1.5 shadow-md sm:px-3 sm:py-2">
            <MapTileLayerControl />
          </div>
        </div>
        <MapHelpHint />
      </div>

      <div className="flex min-h-0 min-w-0 flex-[4] flex-col">
        <MapTable />
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <ShelterMapProvider>
      <HomeContent />
    </ShelterMapProvider>
  );
}
