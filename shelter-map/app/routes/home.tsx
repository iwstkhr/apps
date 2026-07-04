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
    <section className="flex min-h-0 flex-1 flex-col gap-2">
      {(isLoading || loadError) && (
        <div className="shrink-0 text-right text-sm font-medium text-slate-700">
          {isLoading ? (
            <span>データを読み込み中...</span>
          ) : (
            <span className="text-red-700">{loadError}</span>
          )}
        </div>
      )}

      <div className="relative z-0 min-h-0 w-full flex-[5]">
        <div ref={mapContainerRef} className="h-full w-full" />
        <div className="pointer-events-none absolute top-3 right-3 z-[1000]">
          <div className="pointer-events-auto rounded-md border border-slate-300 bg-white px-3 py-2 shadow-md">
            <MapTileLayerControl />
          </div>
        </div>
        <MapHelpHint />
      </div>

      <div className="flex min-h-0 flex-[4] flex-col">
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
