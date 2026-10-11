import { useEffect, useId, useState } from 'react';
import { FaQuestion, FaXmark } from 'react-icons/fa6';
import { SM_MEDIA_QUERY, useMediaQuery } from '~/hooks/use-media-query';

const OPEN_STORAGE_KEY = 'shelter-map:map-help-open';

function getModifierKeyLabel(): string {
  if (typeof navigator === 'undefined') {
    return 'Ctrl';
  }

  return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? '⌘' : 'Ctrl';
}

function readStoredOpen(): boolean | null {
  try {
    const value = window.localStorage.getItem(OPEN_STORAGE_KEY);
    return value === null ? null : value === 'true';
  } catch {
    return null;
  }
}

function storeOpen(open: boolean): void {
  try {
    window.localStorage.setItem(OPEN_STORAGE_KEY, String(open));
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the default applies next time.
  }
}

export function MapHelpHint() {
  const modifierKey = getModifierKeyLabel();
  const panelId = useId();
  const isDesktop = useMediaQuery(SM_MEDIA_QUERY);
  // Until the user toggles it, the help is open on desktops and closed on phones.
  const [storedOpen, setStoredOpen] = useState<boolean | null>(null);
  const open = storedOpen ?? isDesktop;

  useEffect(() => {
    setStoredOpen(readStoredOpen());
  }, []);

  const setOpen = (nextOpen: boolean) => {
    setStoredOpen(nextOpen);
    storeOpen(nextOpen);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="地図の操作方法を表示"
        aria-expanded={false}
        aria-controls={panelId}
        title="地図の操作方法"
        className="absolute bottom-2 left-2 z-[1000] flex size-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-md transition-colors hover:bg-slate-100 sm:bottom-3 sm:left-3"
      >
        <FaQuestion className="size-4" aria-hidden="true" />
      </button>
    );
  }

  return (
    <section
      id={panelId}
      className="absolute bottom-2 left-2 z-[1000] max-w-[min(100%-4rem,20rem)] rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] text-slate-700 shadow-md sm:bottom-3 sm:left-3 sm:max-w-xs sm:px-3 sm:py-2 sm:text-xs"
      aria-label="地図の操作方法"
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="font-semibold text-slate-900">地図の操作</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="地図の操作方法を閉じる"
          aria-expanded
          aria-controls={panelId}
          className="-mr-1 rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <FaXmark className="size-3.5" aria-hidden="true" />
        </button>
      </div>
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
