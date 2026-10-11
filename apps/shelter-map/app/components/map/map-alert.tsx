import { FaXmark } from 'react-icons/fa6';

export function MapAlert({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      className="absolute top-2 left-1/2 z-[1001] flex w-[min(100%-1rem,26rem)] -translate-x-1/2 items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 shadow-md"
    >
      <p className="min-w-0 flex-1">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="閉じる"
        className="shrink-0 rounded p-0.5 text-red-700 hover:bg-red-100"
      >
        <FaXmark className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
