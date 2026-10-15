import { useRef } from 'react';
import { FaBars, FaCheckSquare, FaLock } from 'react-icons/fa';
import { HeaderMenu } from '~/components/layout/header-menu';
import { APP_TAGLINE, t } from '~/lib/i18n';

interface AppHeaderProps {
  menuOpen: boolean;
  onOpenMenu: () => void;
  onExport: () => void;
  onImportFile: (file: File) => void;
  exportDisabled: boolean;
  onClearAll: () => void;
  onResetApp: () => void;
}

export function AppHeader({
  menuOpen,
  onOpenMenu,
  onExport,
  onImportFile,
  exportDisabled,
  onClearAll,
  onResetApp,
}: AppHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header
      id="app-header"
      className="theme-header sticky top-0 z-20 border-b border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      {/* The folder pane's height is derived from the header's, so the header is fixed at h-14 */}
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <button
            id="menu-toggle"
            type="button"
            aria-label={t('フォルダを開く')}
            aria-expanded={menuOpen}
            aria-controls="folder-panel"
            className="header-nav-button shrink-0 rounded-md p-2 text-slate-700 hover:bg-slate-100 lg:hidden dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={onOpenMenu}
          >
            <FaBars aria-hidden="true" />
          </button>
          <h1 className="flex min-w-0 items-center gap-2 text-lg font-bold tracking-tight sm:text-xl">
            <FaCheckSquare className="app-logo h-7 w-7 shrink-0 text-blue-600" aria-hidden="true" />
            <span className="truncate">TODO</span>
          </h1>
          {/* State the key feature next to the title. It is not part of the heading, and narrow screens rely on the footer note instead */}
          <p className="app-tagline hidden shrink-0 items-center gap-1.5 border-l border-slate-300 pl-2 text-xs text-slate-500 sm:flex dark:border-slate-600 dark:text-slate-400">
            <FaLock aria-hidden="true" />
            {t(APP_TAGLINE)}
          </p>
        </div>

        <div className="flex shrink-0 items-center">
          <HeaderMenu
            onExport={onExport}
            exportDisabled={exportDisabled}
            onImport={() => fileInputRef.current?.click()}
            onClearAll={onClearAll}
            // Same condition as export: nothing to delete when there are no todos and no folders
            clearAllDisabled={exportDisabled}
            onResetApp={onResetApp}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label={t('インポートするファイル')}
            onChange={(event) => {
              const file = event.target.files?.[0];
              // Reset to empty so that choosing the same file again still fires change
              event.target.value = '';
              if (file) onImportFile(file);
            }}
          />
        </div>
      </div>
    </header>
  );
}
