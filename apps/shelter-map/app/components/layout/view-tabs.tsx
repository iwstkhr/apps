import { cn } from '~/lib/cn';

export type MobileView = 'map' | 'list';

const views: ReadonlyArray<{ id: MobileView; label: string }> = [
  { id: 'map', label: '地図' },
  { id: 'list', label: '一覧' },
];

/** Switches between the map and the list on phones, where both do not fit on one screen. */
export function ViewTabs({
  view,
  listCount,
  onChange,
}: {
  view: MobileView;
  listCount: number;
  onChange: (view: MobileView) => void;
}) {
  return (
    <div
      className="flex shrink-0 rounded-md border border-slate-300 bg-white p-0.5 shadow-sm sm:hidden"
      role="tablist"
      aria-label="表示の切り替え"
    >
      {views.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={view === id}
          onClick={() => onChange(id)}
          className={cn(
            'flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors',
            view === id ? 'bg-slate-800 text-white' : 'text-slate-700 hover:bg-slate-100',
          )}
        >
          {label}
          {id === 'list' && (
            <span className="ml-1 tabular-nums text-xs opacity-80">
              ({listCount.toLocaleString()})
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
