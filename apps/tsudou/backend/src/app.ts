import express, {
  type ErrorRequestHandler,
  type Express,
  type Request,
  type RequestHandler,
} from 'express';
import type * as z from 'zod';
import { AppError, notFoundError, STATUS_BY_CODE, validationError } from './errors';
import * as ops from './operations';
import type { Repository } from './repository';
import { AnswerBodySchema, CreateEventBodySchema, UpdateEventBodySchema } from './schemas';

export const MANAGE_TOKEN = 'x-manage-token'; // leak-guard:ignore header name
export const EDIT_TOKEN = 'x-edit-token'; // leak-guard:ignore header name

export type AppOptions = {
  /**
   * Rate limiting. Returns true if the request for the key (the client IP) is allowed.
   * Production passes the Workers Rate Limiting binding. When omitted, nothing is limited.
   */
  rateLimit?: (key: string) => Promise<boolean>;
};

const BAD_REQUEST = 'リクエストの形式が正しくありません';

/**
 * Validate the body against a Zod schema (schemas.ts). A shape mismatch is always BAD_REQUEST
 * (validate.ts rejects the values themselves with a Japanese message per field).
 * In PATCH, "omitted = do not change" and "null = clear", so the schemas
 * must distinguish omitted (undefined) from null.
 */
function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body);
  if (!result.success) throw validationError(BAD_REQUEST);
  return result.data;
}

/** The token from a header. An empty string is treated the same as "absent". */
const token = (req: Request, name: string) => req.get(name) || undefined;

/** All API routes live under this path. The UI is served by the same Worker, so it is kept apart from the SPA paths. */
export const API_PREFIX = '/api';

/**
 * The Express app for the public API. The actual work is delegated to operations.ts
 * (operations.ts only takes an injected Repository, so it is easy to test).
 *
 * It is called from the same origin as the UI, so CORS is not handled.
 * There are intentionally no routes that list events or responses.
 *
 * When adding routes or changing inputs and outputs, update the definitions in openapi.ts too,
 * and regenerate docs/openapi.yaml with `pnpm run openapi`.
 */
export function createApp(repo: Repository, options: AppOptions = {}): Express {
  const app = express();
  app.disable('x-powered-by');

  const api = express.Router();
  if (options.rateLimit) {
    api.use(rateLimit(options.rateLimit));
  }
  api.use(express.json({ limit: '100kb' }));

  /** For health checks. */
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

  /** Can be deleted with either the edit key (the respondent) or the manage token (the host). */
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
 * Turn AppError into an error response with its status.
 * JSON parse failures and size limit errors are treated as input errors,
 * and only unexpected exceptions are logged in detail (Workers Logs) and collapsed into INTERNAL.
 */
const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  let appError: AppError;
  if (error instanceof AppError) {
    appError = error;
  } else if (isBodyParserError(error)) {
    appError = validationError(BAD_REQUEST);
  } else {
    // The first argument is interpreted as a format string, so it is fixed, and request-derived values are passed after it
    console.error('unexpected error:', `${req.method} ${req.path}`, error);
    appError = new AppError('INTERNAL', '処理に失敗しました。時間をおいて再度お試しください');
  }

  res.status(STATUS_BY_CODE[appError.code]).json({
    error: { code: appError.code, message: appError.detail },
  });
};

/** Client-caused errors thrown by express.json() (invalid JSON, size limit exceeded, etc.). */
function isBodyParserError(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

/**
 * The header in which Cloudflare puts the client IP. It is absent outside Workers (in tests),
 * so in that case everyone shares one key.
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
