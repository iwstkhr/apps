import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import './index.css';
import { queryClient } from './lib/queryClient';
import { registerServiceWorker } from './lib/serviceWorker';
import { purgeLegacyTokens } from './lib/storage';
import { router } from './router';

const container = document.getElementById('root');
if (!container) {
  throw new Error('#root が見つかりません');
}

purgeLegacyTokens();
registerServiceWorker();

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
