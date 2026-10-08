import express, {
  type ErrorRequestHandler,
  type Express,
  type Request,
  type RequestHandler,
} from 'express';
import { AppError, notFoundError, validationError } from './errors';
import { BAD_REQUEST, parseBody, STATUS_BY_CODE } from './http';
import * as ops from './operations';
import type { Repository } from './repository';
import { AnswerBodySchema, CreateEventBodySchema, UpdateEventBodySchema } from './schemas';

export const MANAGE_TOKEN = 'x-manage-token'; // leak-guard:ignore ヘッダ名
export const EDIT_TOKEN = 'x-edit-token'; // leak-guard:ignore ヘッダ名

export type AppOptions = {
  /**
   * レート制限。キー (クライアントの IP) ごとに、許可するなら true を返す。
   * 本番は Workers の Rate Limiting バインディングを渡す。省略すると制限しない。
   */
  rateLimit?: (key: string) => Promise<boolean>;
};

/** ヘッダのトークン。空文字は「無い」と同じに扱う。 */
const token = (req: Request, name: string) => req.get(name) || undefined;

/** API のルートはすべてこの下に置く。画面と同じ Worker で配信するため、SPA のパスと分ける。 */
export const API_PREFIX = '/api';

/**
 * 公開 API の Express アプリ。実処理は operations.ts に委譲する
 * (operations.ts は Repository を注入するだけなのでテストしやすい)。
 *
 * 画面と同じオリジンから呼ばれるので CORS は扱わない。
 * イベントや回答を列挙するルートは意図的に存在しない。
 *
 * ルートを足したり入出力を変えたりしたら、openapi.ts の定義も合わせて直し、
 * `pnpm run openapi` で docs/openapi.yaml を作り直す。
 */
export function createApp(repo: Repository, options: AppOptions = {}): Express {
  const app = express();
  app.disable('x-powered-by');

  const api = express.Router();
  if (options.rateLimit) {
    api.use(rateLimit(options.rateLimit));
  }
  api.use(express.json({ limit: '100kb' }));

  /** 稼働確認用。 */
  api.get('/healthz', (_req, res) => {
    res.json({ ok: true });
  });

  api.post('/events', async (req, res) => {
    const result = await ops.createEvent(repo, parseBody(CreateEventBodySchema, req.body));
    res.status(201).json(result);
  });

  api.get('/events/:eventId', async (req, res) => {
    const view = await ops.getEvent(repo, { eventId: req.params.eventId });
    if (!view) throw notFoundError('イベントが見つかりません');
    res.json(view);
  });

  api.patch('/events/:eventId', async (req, res) => {
    const view = await ops.updateEvent(repo, {
      ...parseBody(UpdateEventBodySchema, req.body),
      eventId: req.params.eventId,
      manageToken: token(req, MANAGE_TOKEN) ?? '',
    });
    res.json(view);
  });

  api.delete('/events/:eventId', async (req, res) => {
    await ops.deleteEvent(repo, {
      eventId: req.params.eventId,
      manageToken: token(req, MANAGE_TOKEN) ?? '',
    });
    res.status(204).end();
  });

  api.post('/events/:eventId/answers', async (req, res) => {
    const result = await ops.submitAnswer(repo, {
      ...parseBody(AnswerBodySchema, req.body),
      eventId: req.params.eventId,
    });
    res.status(201).json(result);
  });

  api.put('/answers/:answerId', async (req, res) => {
    const view = await ops.updateAnswer(repo, {
      ...parseBody(AnswerBodySchema, req.body),
      answerId: req.params.answerId,
      editToken: token(req, EDIT_TOKEN) ?? '',
    });
    res.json(view);
  });

  /** 編集キー (本人) または管理トークン (ホスト) のどちらかで削除できる。 */
  api.delete('/answers/:answerId', async (req, res) => {
    await ops.deleteAnswer(repo, {
      answerId: req.params.answerId,
      editToken: token(req, EDIT_TOKEN),
      manageToken: token(req, MANAGE_TOKEN),
    });
    res.status(204).end();
  });

  app.use(API_PREFIX, api);

  app.use((req) => {
    throw notFoundError(`未対応の操作です: ${req.method} ${req.path}`);
  });

  app.use(errorHandler);
  return app;
}

/**
 * AppError はステータス付きのエラーレスポンスに変える。
 * JSON のパース失敗やサイズ超過は入力エラーとして扱い、
 * 想定外の例外だけ詳細をログ (Workers Logs) に残して INTERNAL に潰す。
 */
const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  let appError: AppError;
  if (error instanceof AppError) {
    appError = error;
  } else if (isBodyParserError(error)) {
    appError = validationError(BAD_REQUEST);
  } else {
    // 第 1 引数は書式文字列として解釈されるため固定にし、リクエスト由来の値は後ろに渡す
    console.error('unexpected error:', `${req.method} ${req.path}`, error);
    appError = new AppError('INTERNAL', '処理に失敗しました。時間をおいて再度お試しください');
  }

  res.status(STATUS_BY_CODE[appError.code]).json({
    error: { code: appError.code, message: appError.detail },
  });
};

/** express.json() が投げる、クライアント起因のエラー (不正な JSON・サイズ超過など)。 */
function isBodyParserError(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

/**
 * Cloudflare がクライアントの IP を入れるヘッダ。Workers の外 (テスト) では付かないので、
 * 無ければ全員を 1 つのキーにまとめる。
 */
const CLIENT_IP = 'cf-connecting-ip';

function rateLimit(allow: (key: string) => Promise<boolean>): RequestHandler {
  return async (req, _res, next) => {
    if (await allow(req.get(CLIENT_IP) ?? 'unknown')) {
      next();
      return;
    }
    next(new AppError('RATE_LIMITED', 'アクセスが集中しています。時間をおいて再度お試しください'));
  };
}
