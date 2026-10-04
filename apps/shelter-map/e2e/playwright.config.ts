import { defineConfig } from '@playwright/test';

const PORT = process.env.E2E_PORT ?? '8789';
const CI = !!process.env.CI;

/**
 * 本番と同じ構成 (wrangler dev が build/client/ を静的アセットとして配信) で画面を操作する。
 * 地図タイルは外部サーバへ取りに行かないよう fixtures.ts で差し替える。
 */
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  // パッケージ直下から実行しても、結果は e2e/ の下にまとめる
  outputDir: 'test-results',
  reporter: CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // インストール済みの Google Chrome を使う (GitHub Actions の ubuntu-latest にも入っている)
    channel: 'chrome',
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/serve.mjs',
    url: `http://localhost:${PORT}`,
    env: { E2E_PORT: PORT },
    reuseExistingServer: !CI,
    // 本番ビルドを含む
    timeout: 180_000,
    // 既定の SIGKILL では wrangler が子プロセス (workerd) を片付けられずに残る
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    stdout: 'pipe',
  },
});
