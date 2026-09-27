import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/** オフラインでも画面を起動できるよう、install 時に取っておく public/ のファイル */
const PRECACHE_PUBLIC = ['/favicon.svg'];

/**
 * src/sw.js の先頭に、キャッシュの版 (VERSION) と先読みするファイル (PRECACHE) を足して
 * dist/sw.js を出力する。ビルド成果物のファイル名は毎回変わるので、ここで一覧を作る。
 * 画像 (使い方ページの画面キャプチャ) は大きいので先読みせず、開いたときにキャッシュする。
 */
function serviceWorker(): Plugin {
  return {
    name: 'tsudou:service-worker',
    apply: 'build',
    // index.html は Vite の HTML プラグインが generateBundle で出力するので、その後に動かす
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
    // 本番では API が同じ Worker の /api 以下にあるので、開発時も同一オリジンに見せる。
    // 転送先は `pnpm run dev:api` (backend で wrangler dev) の待ち受けポート
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
