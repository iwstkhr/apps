// Start the server for e2e tests (called from webServer in playwright.config.ts).
//
// As in production, wrangler dev serves the built build/client/ as static assets.
//
//   E2E_PORT        Port to listen on (default 8789)
//   E2E_SKIP_BUILD  Skip the build when 1 (use the existing build/client/)
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PORT = process.env.E2E_PORT ?? '8789';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

if (process.env.E2E_SKIP_BUILD !== '1') {
  execFileSync('pnpm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });
}

// Start wrangler directly: through pnpm exec, termination signals do not reach wrangler (and its child workerd), which is left running after the tests
const server = spawn(
  `${ROOT}node_modules/.bin/wrangler`,
  ['dev', '--port', PORT, '--show-interactive-dev-session=false'],
  { cwd: ROOT, stdio: 'inherit' },
);
// Playwright sends SIGTERM when the tests finish (gracefulShutdown in playwright.config.ts)
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('exit', (code) => process.exit(code ?? 0));
