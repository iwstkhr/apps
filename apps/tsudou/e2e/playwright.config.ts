import { defineConfig } from '@playwright/test';
import type { Options } from './fixtures';

const PORT = process.env.E2E_PORT ?? '8788';
const CI = !!process.env.CI;

/**
 * 画面と API をまたぐ流れを、本番と同じ構成 (wrangler dev が UI と API を配信) で確かめる。
 * 同じテストを日本語表示と英語表示の 2 つのプロジェクトで回す。
 */
export default defineConfig<Options>({
  testDir: 'tests',
  // テストどうしは別々のイベントを使うので並列に回せる
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // インストール済みの Google Chrome を使う (GitHub Actions の ubuntu-latest にも入っている)
    channel: 'chrome',
    timezoneId: 'Asia/Tokyo',
    // Service Worker のキャッシュで、テスト間に古い画面が出ないようにする
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'ja', use: { language: 'ja', locale: 'ja-JP' } },
    { name: 'en', use: { language: 'en', locale: 'en-US' } },
  ],
  webServer: {
    command: 'node scripts/serve.mjs',
    url: `http://localhost:${PORT}`,
    env: { E2E_PORT: PORT },
    reuseExistingServer: !CI,
    // フロントエンドのビルドと D1 のマイグレーションを含む
    timeout: 180_000,
    // 既定の SIGKILL では wrangler が子プロセス (workerd) を片付けられずに残る
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    stdout: 'pipe',
  },
});
