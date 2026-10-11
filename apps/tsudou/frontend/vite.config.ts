import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/** Files in public/ fetched on install so the UI can start offline */
const PRECACHE_PUBLIC = ['/favicon.svg'];

/**
 * Prepend the cache version (VERSION) and the files to precache (PRECACHE) to src/sw.js
 * and output dist/sw.js. Build output file names change every time, so the list is built here.
 * Images (the guide page screenshots) are large, so they are not precached and are cached when opened.
 */
function serviceWorker(): Plugin {
  return {
    name: 'tsudou:service-worker',
    apply: 'build',
    // index.html is emitted by Vite's HTML plugin in generateBundle, so run after it
    enforce: 'post',
    generateBundle(_, bundle) {
      const files = Object.values(bundle)
        .filter((file) => /\.(html|js|css)$/.test(file.fileName))
        .sort((a, b) => a.fileName.localeCompare(b.fileName));
      const hash = createHash('sha256');
      for (const file of files) {
        hash.update(file.fileName);
        hash.update(file.type === 'chunk' ? file.code : file.source);
      }
      const precache = [
        ...files.map((file) => (file.fileName === 'index.html' ? '/' : `/${file.fileName}`)),
        ...PRECACHE_PUBLIC,
      ];
      const template = readFileSync(new URL('./src/sw.js', import.meta.url), 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: [
          `const VERSION = ${JSON.stringify(hash.digest('hex').slice(0, 16))};`,
          `const PRECACHE = ${JSON.stringify(precache)};`,
          template,
        ].join('\n'),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serviceWorker()],
  server: {
    // In production the API is under /api in the same Worker, so development also makes it look same-origin.
    // The target is the port that `pnpm run dev:api` (wrangler dev in backend) listens on
    proxy: { '/api': 'http://localhost:8080' },
  },
  test: {
    name: 'frontend',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
