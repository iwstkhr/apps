import path from 'node:path';
import type { Config } from '@react-router/dev/config';
import { writeServiceWorker } from './scripts/write-service-worker';

export default {
  ssr: false,
  // SPA の index.html が出来た後に、ビルド出力をすべて先読みする Service Worker を書き出す
  async buildEnd({ reactRouterConfig }) {
    await writeServiceWorker(path.join(reactRouterConfig.buildDirectory, 'client'));
  },
} satisfies Config;
