import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

/** On wide screens, collapses the list beside the map so the map can take the full width. */
export function ListPanelToggle({
  expanded,
  controls,
  onToggle,
}: {
  expanded: boolean;
  controls: string;
  onToggle: () => void;
}) {
  const label = expanded ? '一覧を隠す' : '一覧を表示';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={controls}
      aria-label={label}
      title={label}
      className="absolute top-1/2 left-0 z-[1000] hidden h-12 w-5 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-slate-300 bg-white text-slate-600 shadow-md transition-colors hover:bg-slate-100 hover:text-slate-900 lg:flex"
    >
      {expanded ? (
        <FaChevronLeft className="size-3" aria-hidden="true" />
      ) : (
        <FaChevronRight className="size-3" aria-hidden="true" />
      )}
    </button>
  );
}
