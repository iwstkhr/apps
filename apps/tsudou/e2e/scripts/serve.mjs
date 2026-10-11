// Start the server for e2e tests (called from webServer in playwright.config.ts).
//
// As in production, a single Worker (wrangler dev) serves the built frontend and the API.
// D1 is recreated every time in a location separate from development (backend/.wrangler/), so it never mixes with development data.
// Runs in the e2e environment of wrangler.jsonc, which relaxes the rate limit (the tests send many requests from the same IP in a short time).
//
//   E2E_PORT        Port to listen on (default 8788)
//   E2E_SKIP_BUILD  Skip the frontend build when 1 (use the existing frontend/dist/)
import { execFileSync, spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PORT = process.env.E2E_PORT ?? '8788';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const BACKEND = `${ROOT}backend`;
const STATE = fileURLToPath(new URL('../.wrangler/state', import.meta.url));

const run = (args, cwd) => execFileSync('pnpm', args, { cwd, stdio: 'inherit' });

if (process.env.E2E_SKIP_BUILD !== '1') run(['run', 'build'], `${ROOT}frontend`);

rmSync(STATE, { recursive: true, force: true });
run(
  [
    'exec',
    'wrangler',
    'd1',
    'migrations',
    'apply',
    'tsudou',
    '--local',
    '--env',
    'e2e',
    '--persist-to',
    STATE,
  ],
  BACKEND,
);

// Start wrangler directly: through pnpm exec, termination signals do not reach wrangler (and its child workerd), which is left running after the tests
const server = spawn(
  `${BACKEND}/node_modules/.bin/wrangler`,
  [
    'dev',
    '--env',
    'e2e',
    '--port',
    PORT,
    '--persist-to',
    STATE,
    '--show-interactive-dev-session=false',
  ],
  { cwd: BACKEND, stdio: 'inherit' },
);
// Playwright sends SIGTERM when the tests finish (gracefulShutdown in playwright.config.ts)
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('exit', (code) => process.exit(code ?? 0));
