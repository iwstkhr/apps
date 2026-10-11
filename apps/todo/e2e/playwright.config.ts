import { defineConfig } from '@playwright/test';

const PORT = process.env.E2E_PORT ?? '8790';
const CI = !!process.env.CI;

/**
 * Drive the UI with the same setup as production (wrangler dev serves build/client/ as static assets).
 * Each test stores data in the IndexedDB of a new browser context.
 */
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  // Keep the output under e2e/ even when run from the package root
  outputDir: 'test-results',
  reporter: CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Use the installed Google Chrome (also available on GitHub Actions ubuntu-latest)
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
    // Includes the production build
    timeout: 180_000,
    // With the default SIGKILL, wrangler cannot clean up its child process (workerd), which is left running
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    stdout: 'pipe',
  },
});
