import { httpServerHandler } from 'cloudflare:node';
import { env } from 'cloudflare:workers';
import { createApp } from './app';
import { createD1Repository, deleteExpired } from './d1-repository';

/**
 * Cloudflare Workers のエントリ (wrangler.jsonc の main)。
 * Express アプリをこの Worker 内のポートで listen させ、httpServerHandler が
 * Workers の fetch をそのポートへの HTTP リクエストに変換して渡す (実際のソケットは開かない)。
 * 静的アセットは Worker を通らずに返るので、ここに届くのは主に /api/* (run_worker_first) だけ。
 * それ以外のパスが届いた場合は Express が 404 を返す。
 */
const PORT = 8080;

createApp(createD1Repository(env.DB), {
  rateLimit: async (key) => (await env.RATE_LIMITER.limit({ key })).success,
}).listen(PORT);

export default {
  ...httpServerHandler({ port: PORT }),

  /** 保持期間を過ぎたイベントと回答を消す (wrangler.jsonc の triggers.crons)。 */
  async scheduled(controller) {
    const deleted = await deleteExpired(env.DB, Math.floor(controller.scheduledTime / 1000));
    console.log(`deleted ${deleted} expired rows`);
  },
} satisfies ExportedHandler<Env>;
