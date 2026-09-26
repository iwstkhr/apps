import { useMemo } from 'react';

function getModifierKeyLabel(): string {
  if (typeof navigator === 'undefined') {
    return 'Ctrl';
  }

  return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? '⌘' : 'Ctrl';
}

export function MapHelpHint() {
  const modifierKey = useMemo(() => getModifierKeyLabel(), []);

  return (
    <section
      className="pointer-events-none absolute bottom-2 left-2 z-[1000] max-w-[min(100%-1rem,20rem)] rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] text-slate-700 shadow-md sm:bottom-3 sm:left-3 sm:max-w-xs sm:px-3 sm:py-2 sm:text-xs"
      aria-label="地図の操作方法"
    >
      <p className="mb-1 font-semibold text-slate-900">地図の操作</p>
      <ul className="space-y-1">
        <li className="hidden flex-wrap items-center gap-1 sm:flex">
          <span>
            <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-sans text-[11px] font-medium text-slate-800">
              {modifierKey}
            </kbd>
            + スクロール
          </span>
          <span className="text-slate-600">… ズーム</span>
        </li>
        <li className="sm:hidden">
          <span className="font-medium text-slate-800">ピンチ</span>
          <span className="text-slate-600"> … ズーム</span>
        </li>
        <li>
          <span className="font-medium text-slate-800">ドラッグ</span>
          <span className="text-slate-600"> … 地図を移動</span>
        </li>
        <li>
          <span className="font-medium text-slate-800">
            <span className="sm:hidden">タップ</span>
            <span className="hidden sm:inline">クリック</span>
          </span>
          <span className="text-slate-600"> … 避難所の詳細を表示</span>
        </li>
      </ul>
    </section>
  );
}
