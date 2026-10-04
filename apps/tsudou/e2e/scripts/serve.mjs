// e2e テスト用のサーバを立てる (playwright.config.ts の webServer から呼ばれる)。
//
// 本番と同じく、ビルドしたフロントエンドと API を 1 つの Worker (wrangler dev) で配信する。
// D1 は開発用 (backend/.wrangler/) とは別の場所に毎回作り直すので、開発中のデータと混ざらない。
// wrangler.jsonc の e2e 環境で動かし、レート制限を緩める (同じ IP から短時間に多く送るため)。
//
//   E2E_PORT        待ち受けるポート (既定 8788)
//   E2E_SKIP_BUILD  1 ならフロントエンドのビルドを省く (ビルド済みの frontend/dist/ を使う)
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

// pnpm exec を挟むと終了のシグナルが wrangler (と子の workerd) まで届かず、テスト後に残るので直接起動する
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
// Playwright はテストが終わると SIGTERM を送る (playwright.config.ts の gracefulShutdown)
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('exit', (code) => process.exit(code ?? 0));
