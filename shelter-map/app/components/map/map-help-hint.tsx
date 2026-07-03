import { useMemo } from 'react'

function getModifierKeyLabel(): string {
  if (typeof navigator === 'undefined') {
    return 'Ctrl'
  }

  return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? '⌘' : 'Ctrl'
}

export function MapHelpHint() {
  const modifierKey = useMemo(() => getModifierKeyLabel(), [])

  return (
    <section
      className="pointer-events-none absolute bottom-3 left-3 z-[1000] max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 shadow-md"
      aria-label="地図の操作方法"
    >
      <p className="mb-1 font-semibold text-slate-900">地図の操作</p>
      <ul className="space-y-1">
        <li className="flex flex-wrap items-center gap-1">
          <span>
            <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-sans text-[11px] font-medium text-slate-800">
              {modifierKey}
            </kbd>
            + スクロール
          </span>
          <span className="text-slate-600">… ズーム</span>
        </li>
        <li>
          <span className="font-medium text-slate-800">ドラッグ</span>
          <span className="text-slate-600"> … 地図を移動</span>
        </li>
        <li>
          <span className="font-medium text-slate-800">クリック</span>
          <span className="text-slate-600"> … 避難所の詳細を表示</span>
        </li>
      </ul>
    </section>
  )
}
