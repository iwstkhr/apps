import { ApiError, parseApiError } from './errors';
import type { AnswerView, CandidateInput, Choice, EventView } from './types';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * The API lives under `/api` in the same Worker as the UI (backend/wrangler.jsonc). It is the same origin, so CORS is unnecessary.
 * In local development, Vite's dev server forwards `/api` to wrangler dev (vite.config.ts).
 */
const API_BASE = '/api';

/** Tokens are sent in a dedicated header, not in the path or query (so they stay out of access logs). */
type Tokens = { manageToken?: string | undefined; editToken?: string | undefined };

/**
 * Call the API, returning the JSON on success (undefined for 204) and throwing ApiError on failure.
 *
 * The API server (backend/src/app.ts) guarantees the response shape,
 * so casting to the app's types is confined to this one place. Each function's return type annotation guards the types.
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
    // Not found (including expired) is a normal case and returns null
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
