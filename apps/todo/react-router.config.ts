import path from 'node:path';
import type { Config } from '@react-router/dev/config';
import { writeServiceWorker } from './scripts/write-service-worker';

export default {
  ssr: false,
  // After the SPA's index.html is generated, write the Service Worker that precaches all build output
  async buildEnd({ reactRouterConfig }) {
    await writeServiceWorker(path.join(reactRouterConfig.buildDirectory, 'client'));
  },
} satisfies Config;
