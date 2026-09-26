import { Link, Outlet } from 'react-router';
import { TextLink } from '../components/TextLink';

export function Root() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-baseline gap-2 text-slate-900 dark:text-slate-50">
            <span className="text-base font-bold tracking-tight">Tsudou</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">イベント日程調整</span>
          </Link>
          <div className="flex items-center gap-3">
            <TextLink to="/">新しく作る</TextLink>
          </div>
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
