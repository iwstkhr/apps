import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';
import { publicUrl } from '~/lib/public-url';
import type { Route } from './+types/root';
import './app.css';
import { t } from '~/lib/i18n';

export const links: Route.LinksFunction = () => [
  { rel: 'icon', href: publicUrl('favicon.svg'), type: 'image/svg+xml' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = t('エラーが発生しました');
  let details = t('予期しないエラーが発生しました。');

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : t('エラー');
    details =
      error.status === 404
        ? t('お探しのページは見つかりませんでした。')
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
  }

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-3xl font-bold">{message}</h1>
      <p className="mt-2 text-slate-700 dark:text-slate-300">{details}</p>
    </main>
  );
}
