import { ApiError, parseApiError } from './errors';
import type { AnswerView, CandidateInput, Choice, EventView } from './types';

export type { CandidateInput } from './types';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * API は画面と同じ Worker の `/api` 以下にある (backend/wrangler.jsonc)。同一オリジンなので CORS は要らない。
 * ローカル開発では Vite の開発サーバが `/api` を wrangler dev に転送する (vite.config.ts)。
 */
const API_BASE = '/api';

/** トークンはパスやクエリに載せず、専用ヘッダで送る (アクセスログに残さないため)。 */
type Tokens = { manageToken?: string | undefined; editToken?: string | undefined };

/**
 * API を呼び、成功なら JSON (204 なら undefined) を返し、失敗なら ApiError を投げる。
 *
 * レスポンスの形は API サーバ (backend/src/app.ts) が保証しているので、
 * アプリ内の型へのキャストはここ一箇所に閉じ込める。各関数の戻り値注釈が型の門番になる。
 */
async function request<T>(
  method: Method,
  path: string,
  options: { body?: unknown; tokens?: Tokens } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (options.tokens?.manageToken) headers['x-manage-token'] = options.tokens.manageToken;
  if (options.tokens?.editToken) headers['x-edit-token'] = options.tokens.editToken;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('NETWORK', '通信に失敗しました。接続を確認して再度お試しください');
  }

  if (response.status === 204) return undefined as T;

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw parseApiError(body);
  return body as T;
}

const eventPath = (eventId: string) => `/events/${encodeURIComponent(eventId)}`;
const answerPath = (answerId: string) => `/answers/${encodeURIComponent(answerId)}`;

export async function createEvent(input: {
  title: string;
  fee: number | null;
  memo: string | null;
  candidates: CandidateInput[];
}): Promise<{ eventId: string; manageToken: string }> {
  return request('POST', '/events', { body: input });
}

export async function getEvent(eventId: string): Promise<EventView | null> {
  try {
    return await request<EventView>('GET', eventPath(eventId));
  } catch (error) {
    // 未存在 (期限切れを含む) は正常系として null を返す
    if (error instanceof ApiError && error.code === 'NOT_FOUND') return null;
    throw error;
  }
}

export async function updateEvent({
  eventId,
  manageToken,
  ...patch
}: {
  eventId: string;
  manageToken: string;
  title?: string;
  fee?: number | null;
  memo?: string | null;
  candidates?: CandidateInput[];
  closed?: boolean;
}): Promise<EventView> {
  return request('PATCH', eventPath(eventId), { body: patch, tokens: { manageToken } });
}

export async function deleteEvent(eventId: string, manageToken: string): Promise<void> {
  await request('DELETE', eventPath(eventId), { tokens: { manageToken } });
}

export async function submitAnswer({
  eventId,
  ...answer
}: {
  eventId: string;
  name: string;
  message: string | null;
  choices: Choice[];
}): Promise<{ answer: AnswerView; editToken: string }> {
  return request('POST', `${eventPath(eventId)}/answers`, { body: answer });
}

export async function updateAnswer({
  answerId,
  editToken,
  ...answer
}: {
  answerId: string;
  editToken: string;
  name: string;
  message: string | null;
  choices: Choice[];
}): Promise<AnswerView> {
  return request('PUT', answerPath(answerId), { body: answer, tokens: { editToken } });
}

export async function deleteAnswer({
  answerId,
  ...tokens
}: {
  answerId: string;
  editToken?: string;
  manageToken?: string;
}): Promise<void> {
  await request('DELETE', answerPath(answerId), { tokens });
}
