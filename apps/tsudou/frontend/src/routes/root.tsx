import { Link, Outlet, useLocation } from 'react-router';
import { HeaderMenu } from '../components/header-menu';
import { t, useLanguage } from '../lib/i18n';

export function Root() {
  useLanguage();
  const location = useLocation();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="theme-header border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-slate-900 dark:text-slate-50">
            {/* リンク名はテキストの「Tsudou」で足りるので、アイコンは装飾扱い */}
            <img src="/favicon.svg" alt="" width={24} height={24} className="size-6 shrink-0" />
            <span className="flex items-baseline gap-2">
              <span className="text-base font-bold tracking-tight">Tsudou</span>
              <span className="hidden text-xs text-slate-500 sm:inline dark:text-slate-400">
                {t('イベント日程調整')}
              </span>
            </span>
          </Link>
          <HeaderMenu key={location.key} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        © {new Date().getFullYear()} wasabee.dev. All Rights Reserved.
      </footer>
    </div>
  );
}
