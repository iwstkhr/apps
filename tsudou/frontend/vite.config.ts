import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
