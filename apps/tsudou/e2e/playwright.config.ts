import { defineConfig } from '@playwright/test';
import type { Options } from './fixtures';

const PORT = process.env.E2E_PORT ?? '8788';
const CI = !!process.env.CI;

/**
 * Check flows spanning the UI and the API with the same setup as production (wrangler dev serves the UI and API).
 * The same tests run in two projects: Japanese display and English display.
 */
export default defineConfig<Options>({
  testDir: 'tests',
  // Tests use separate events, so they can run in parallel
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Use the installed Google Chrome (also available on GitHub Actions ubuntu-latest)
    channel: 'chrome',
    timezoneId: 'Asia/Tokyo',
    // Prevent the Service Worker cache from showing a stale page between tests
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
    // Includes the frontend build and the D1 migrations
    timeout: 180_000,
    // With the default SIGKILL, wrangler cannot clean up its child process (workerd), which is left running
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    stdout: 'pipe',
  },
});
