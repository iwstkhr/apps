import { AppError, duplicateNameError } from './errors';
import type {
  AnswerPatch,
  AnswerRecord,
  EventPatch,
  EventRecord,
  NewAnswer,
  NewEvent,
  Repository,
} from './repository';

/**
 * A D1 row (migrations/0001_init.sql). Column names are snake_case,
 * arrays are stored as JSON strings, and booleans as 0 / 1.
 */
type EventRow = {
  id: string;
  title: string;
  fee: number | null;
  memo: string | null;
  candidates: string;
  closed: number;
  manage_token_hash: string;
  expires_at: number;
  created_at: string;
  updated_at: string;
};

type AnswerRow = {
  id: string;
  event_id: string;
  name: string;
  message: string | null;
  choices: string;
  edit_token_hash: string;
  expires_at: number;
  created_at: string;
  updated_at: string;
};

const toEvent = (row: EventRow): EventRecord => ({
  id: row.id,
  title: row.title,
  fee: row.fee,
  memo: row.memo,
  candidates: JSON.parse(row.candidates),
  closed: row.closed === 1,
  manageTokenHash: row.manage_token_hash,
  expiresAt: row.expires_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toAnswer = (row: AnswerRow): AnswerRecord => ({
  id: row.id,
  eventId: row.event_id,
  name: row.name,
  message: row.message,
  choices: JSON.parse(row.choices),
  editTokenHash: row.edit_token_hash,
  expiresAt: row.expires_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Columns that partial updates may SET. Keys use the Record names, which match the column names. */
const EVENT_COLUMNS: Record<keyof EventPatch, true> = {
  title: true,
  fee: true,
  memo: true,
  candidates: true,
  closed: true,
};

const ANSWER_COLUMNS: Record<keyof AnswerPatch, true> = {
  name: true,
  message: true,
  choices: true,
};

/** Convert to values stored in D1: arrays become JSON strings and booleans 0 / 1. */
function encode(value: unknown): unknown {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

/**
 * Convert D1 exceptions into AppError.
 * The original error goes only to Workers Logs, and the client gets a generic message.
 * Only an attempt to add a response with a duplicate name to the same event (UNIQUE constraint violation) becomes DUPLICATE_NAME.
 * operations.ts also checks this beforehand, but simultaneous submissions are rejected here.
 */
async function run<T>(context: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (String(error).includes('UNIQUE constraint failed: answers.event_id, answers.name')) {
      throw duplicateNameError();
    }
    console.error('D1 operation failed:', context, error);
    throw new AppError('INTERNAL', 'データの処理に失敗しました');
  }
}

/**
 * SET only the keys present in patch and return the updated row.
 * Updating a missing row is unexpected (callers check that it exists), so it is INTERNAL.
 */
function prepareUpdate(
  db: D1Database,
  table: 'events' | 'answers',
  columns: Record<string, true>,
  id: string,
  patch: Record<string, unknown>,
  timestamp = new Date().toISOString(),
): D1PreparedStatement {
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  const assignments = entries.map(([key]) => `${key} = ?`);
  const values = entries.map(([key, value]) => {
    if (!Object.hasOwn(columns, key)) throw new Error(`更新できない項目です: ${key}`);
    return encode(value);
  });
  return db
    .prepare(
      `UPDATE ${table} SET ${[...assignments, 'updated_at = ?'].join(', ')} WHERE id = ? RETURNING *`,
    )
    .bind(...values, timestamp, id);
}

/**
 * Adjust choices based on the responses as of saving. Responses read beforehand are not written back,
 * so even when this races with a response edit, the choices at that moment are kept.
 */
function prepareReconcileAnswers(db: D1Database, eventId: string, timestamp: string) {
  const choices = `(SELECT json_group_array(json_object(
    'candidateId', json_extract(candidate.value, '$.id'),
    'status', COALESCE((
      SELECT json_extract(choice.value, '$.status')
      FROM json_each(answers.choices) AS choice
      WHERE json_extract(choice.value, '$.candidateId') = json_extract(candidate.value, '$.id')
    ), 'MAYBE')
  )) FROM json_each((SELECT candidates FROM events WHERE id = answers.event_id)) AS candidate)`;
  return db
    .prepare(
      `UPDATE answers SET choices = ${choices}, updated_at = ?
     WHERE event_id = ? AND choices != ${choices}`,
    )
    .bind(timestamp, eventId);
}

/** The production Repository implementation. Tests use memory-repository.ts. */
export function createD1Repository(db: D1Database): Repository {
  return {
    async createEvent(input: NewEvent) {
      const timestamp = new Date().toISOString();
      const row = await run('createEvent', () =>
        db
          .prepare(
            `INSERT INTO events
               (id, title, fee, memo, candidates, closed, manage_token_hash, expires_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING *`,
          )
          .bind(
            input.id,
            input.title,
            input.fee,
            input.memo,
            JSON.stringify(input.candidates),
            input.closed ? 1 : 0,
            input.manageTokenHash,
            input.expiresAt,
            timestamp,
            timestamp,
          )
          .first<EventRow>(),
      );
      return toEvent(row as EventRow);
    },

    async getEvent(eventId: string) {
      const row = await run('getEvent', () =>
        db.prepare('SELECT * FROM events WHERE id = ?').bind(eventId).first<EventRow>(),
      );
      return row ? toEvent(row) : null;
    },

    async updateEvent(eventId: string, patch: EventPatch) {
      return run('updateEvent', async () => {
        const timestamp = new Date().toISOString();
        // The whole batch is one transaction. When candidates change, the adjustment is included, and a failure also rolls back the event update.
        const [result] = await db.batch<EventRow>([
          prepareUpdate(db, 'events', EVENT_COLUMNS, eventId, patch, timestamp),
          ...(patch.candidates === undefined
            ? []
            : [prepareReconcileAnswers(db, eventId, timestamp)]),
        ]);
        const row = result.results[0];
        if (!row) throw new Error(`events not found: ${eventId}`);
        return toEvent(row);
      });
    },

    async deleteEvent(eventId: string) {
      // Responses are deleted along with it through the foreign key's ON DELETE CASCADE
      await run('deleteEvent', () =>
        db.prepare('DELETE FROM events WHERE id = ?').bind(eventId).run(),
      );
    },

    async createAnswer(input: NewAnswer) {
      const timestamp = new Date().toISOString();
      const row = await run('createAnswer', () =>
        db
          .prepare(
            `INSERT INTO answers
               (id, event_id, name, message, choices, edit_token_hash, expires_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING *`,
          )
          .bind(
            input.id,
            input.eventId,
            input.name,
            input.message,
            JSON.stringify(input.choices),
            input.editTokenHash,
            input.expiresAt,
            timestamp,
            timestamp,
          )
          .first<AnswerRow>(),
      );
      return toAnswer(row as AnswerRow);
    },

    async getAnswer(answerId: string) {
      const row = await run('getAnswer', () =>
        db.prepare('SELECT * FROM answers WHERE id = ?').bind(answerId).first<AnswerRow>(),
      );
      return row ? toAnswer(row) : null;
    },

    async listAnswersByEvent(eventId: string) {
      // operations.ts sorts by createdAt
      const { results } = await run('listAnswersByEvent', () =>
        db.prepare('SELECT * FROM answers WHERE event_id = ?').bind(eventId).all<AnswerRow>(),
      );
      return results.map(toAnswer);
    },

    async updateAnswer(answerId: string, patch: AnswerPatch) {
      return run('updateAnswer', async () => {
        const row = await prepareUpdate(
          db,
          'answers',
          ANSWER_COLUMNS,
          answerId,
          patch,
        ).first<AnswerRow>();
        if (!row) throw new Error(`answers not found: ${answerId}`);
        return toAnswer(row);
      });
    },

    async deleteAnswer(answerId: string) {
      await run('deleteAnswer', () =>
        db.prepare('DELETE FROM answers WHERE id = ?').bind(answerId).run(),
      );
    },
  };
}

/**
 * Delete events past their retention period (responses go with them through the foreign key). Called from the Cron Trigger.
 * Until they are deleted, operations.ts treats expired events as "not found",
 * so a delayed or failed run does not change what users see.
 * Returns the number of rows deleted (including responses deleted through the foreign key).
 */
export async function deleteExpired(db: D1Database, nowSeconds: number): Promise<number> {
  const result = await db
    .prepare('DELETE FROM events WHERE expires_at <= ?')
    .bind(nowSeconds)
    .run();
  return result.meta.changes;
}
