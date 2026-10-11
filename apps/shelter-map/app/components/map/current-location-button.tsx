import { MdMyLocation } from 'react-icons/md';

export function CurrentLocationButton({
  isLocating,
  onClick,
}: {
  isLocating: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLocating}
      aria-label="現在地を表示"
      title="現在地を表示"
      className="absolute right-2 bottom-7 z-[1000] flex size-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 shadow-md transition-colors hover:bg-slate-100 hover:text-blue-700 disabled:cursor-wait sm:right-3"
    >
      {isLocating ? (
        <span
          className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"
          aria-hidden="true"
        />
      ) : (
        <MdMyLocation className="size-5" aria-hidden="true" />
      )}
    </button>
  );
}
