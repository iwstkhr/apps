import { isRouteErrorResponse, Links, Meta, Scripts, ScrollRestoration } from 'react-router';
import { AppShell } from '~/components/layout/app-shell';
import type { Route } from './+types/root';
import './app.css';

export const links: Route.LinksFunction = () => [
  { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
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
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <AppShell />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'エラーが発生しました';
  let details = '予期しないエラーが発生しました。';

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'エラー';
    details =
      error.status === 404 ? 'お探しのページは見つかりませんでした。' : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
  }

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-3xl font-bold">{message}</h1>
      <p className="mt-2 text-slate-700">{details}</p>
    </main>
  );
}
