import { Outlet } from 'react-router';
import { AppHeader } from '~/components/layout/app-header';

export function AppShell() {
  return (
    <div className="flex h-svh flex-col overflow-hidden bg-slate-50 text-slate-900">
      <AppHeader />

      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col p-4 pt-2">
        <Outlet />
      </div>
    </div>
  );
}
