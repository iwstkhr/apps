import { useRef } from 'react';
import { FaFileExport, FaFileImport } from 'react-icons/fa';
import { publicUrl } from '~/lib/public-url';

const actionClass =
  'inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';

interface AppHeaderProps {
  onExport: () => void;
  onImportFile: (file: File) => void;
  exportDisabled: boolean;
}

export function AppHeader({ onExport, onImportFile, exportDisabled }: AppHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {/* フォルダ欄の高さをヘッダーの高さから決めるので、高さは h-14 に固定する */}
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-3 sm:px-4">
        <h1 className="flex min-w-0 items-center gap-2 text-lg font-bold tracking-tight sm:text-xl">
          <img
            src={publicUrl('favicon.svg')}
            alt=""
            aria-hidden="true"
            className="h-7 w-7 shrink-0"
          />
          <span className="truncate">TODO</span>
        </h1>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            className={actionClass}
            onClick={onExport}
            disabled={exportDisabled}
            title="すべての TODO を JSON ファイルに保存します"
          >
            <FaFileExport aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">エクスポート</span>
          </button>
          <button
            type="button"
            className={actionClass}
            onClick={() => fileInputRef.current?.click()}
            title="エクスポートした JSON ファイルを読み込みます"
          >
            <FaFileImport aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">インポート</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="インポートするファイル"
            onChange={(event) => {
              const file = event.target.files?.[0];
              // 同じファイルを続けて選んでも change が起きるよう空に戻す
              event.target.value = '';
              if (file) onImportFile(file);
            }}
          />
        </div>
      </div>
    </header>
  );
}
