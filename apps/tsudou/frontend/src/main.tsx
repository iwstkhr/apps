import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import './index.css';
import { applyLanguage, getLanguage } from './lib/i18n';
import { queryClient } from './lib/query-client';
import { registerServiceWorker } from './lib/service-worker';
import { purgeLegacyTokens } from './lib/storage';
import { router } from './router';

const container = document.getElementById('root');
if (!container) {
  throw new Error('#root が見つかりません');
}

applyLanguage(getLanguage());
purgeLegacyTokens();
registerServiceWorker();

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
