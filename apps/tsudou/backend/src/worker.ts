import { httpServerHandler } from 'cloudflare:node';
import { env } from 'cloudflare:workers';
import { createApp } from './app';
import { createD1Repository, deleteExpired } from './d1-repository';

/**
 * The Cloudflare Workers entry point (main in wrangler.jsonc).
 * The Express app listens on a port inside this Worker, and httpServerHandler converts
 * Workers fetch calls into HTTP requests to that port (no real socket is opened).
 * Static assets are returned without going through the Worker, so mostly only /api/* (run_worker_first) reaches here.
 * Express returns 404 for any other path that arrives.
 */
const PORT = 8080;

createApp(createD1Repository(env.DB), {
  rateLimit: async (key) => (await env.RATE_LIMITER.limit({ key })).success,
}).listen(PORT);

export default {
  ...httpServerHandler({ port: PORT }),

  /** Delete events and responses past their retention period (triggers.crons in wrangler.jsonc). */
  async scheduled(controller) {
    const deleted = await deleteExpired(env.DB, Math.floor(controller.scheduledTime / 1000));
    console.log(`deleted ${deleted} expired rows`);
  },
} satisfies ExportedHandler<Env>;
