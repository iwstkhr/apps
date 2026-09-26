export function ShelterDataLoadingOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-white/60"
      role="status"
      aria-live="polite"
      aria-label="避難場所データを読み込み中"
    >
      <div className="flex flex-col items-center gap-3 rounded-md border border-slate-300 bg-white px-4 py-3 shadow-md">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-slate-700">データを読み込み中...</span>
      </div>
    </div>
  );
}
