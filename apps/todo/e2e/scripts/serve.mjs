// e2e テスト用のサーバを立てる (playwright.config.ts の webServer から呼ばれる)。
//
// 本番と同じく、ビルドした build/client/ を wrangler dev が静的アセットとして配信する。
//
//   E2E_PORT        待ち受けるポート (既定 8790)
//   E2E_SKIP_BUILD  1 ならビルドを省く (ビルド済みの build/client/ を使う)
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PORT = process.env.E2E_PORT ?? '8790';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

if (process.env.E2E_SKIP_BUILD !== '1') {
  execFileSync('pnpm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });
}

// pnpm exec を挟むと終了のシグナルが wrangler (と子の workerd) まで届かず、テスト後に残るので直接起動する
const server = spawn(
  `${ROOT}node_modules/.bin/wrangler`,
  ['dev', '--port', PORT, '--show-interactive-dev-session=false'],
  { cwd: ROOT, stdio: 'inherit' },
);
// Playwright はテストが終わると SIGTERM を送る (playwright.config.ts の gracefulShutdown)
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('exit', (code) => process.exit(code ?? 0));
