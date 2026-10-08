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
 * D1 の行 (migrations/0001_init.sql)。列名はスネークケースで、
 * 配列は JSON 文字列、真偽値は 0 / 1 で持つ。
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

/** 部分更新で SET してよい列と、D1 に入れる値への変換。キーは Record 側の名前で、列名と同じ。 */
const EVENT_COLUMNS: Record<keyof EventPatch, (value: never) => unknown> = {
  title: (value: string) => value,
  fee: (value: number | null) => value,
  memo: (value: string | null) => value,
  candidates: (value: unknown[]) => JSON.stringify(value),
  closed: (value: boolean) => (value ? 1 : 0),
};

const ANSWER_COLUMNS: Record<keyof AnswerPatch, (value: never) => unknown> = {
  name: (value: string) => value,
  message: (value: string | null) => value,
  choices: (value: unknown[]) => JSON.stringify(value),
};

/**
 * D1 の例外を AppError に変える。
 * 元のエラーは Workers Logs にだけ残し、クライアントには握り潰した文言を返す。
 * 同じイベントに同じ名前の回答を入れようとした (UNIQUE 制約違反) ときだけは DUPLICATE_NAME にする。
 * operations.ts でも事前に確かめているが、同時に送信された場合はここで弾かれる。
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
 * patch に含まれるキーだけを SET し、更新後の行を返す。
 * 存在しない行の更新は想定外 (呼び出し側で存在を確かめている) なので INTERNAL にする。
 */
function prepareUpdate(
  db: D1Database,
  table: 'events' | 'answers',
  columns: Record<string, (value: never) => unknown>,
  id: string,
  patch: Record<string, unknown>,
  timestamp = new Date().toISOString(),
): D1PreparedStatement {
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  const assignments = entries.map(([key]) => `${key} = ?`);
  const values = entries.map(([key, value]) => {
    const encode = columns[key];
    if (!encode) throw new Error(`更新できない項目です: ${key}`);
    return encode(value as never);
  });
  return db
    .prepare(
      `UPDATE ${table} SET ${[...assignments, 'updated_at = ?'].join(', ')} WHERE id = ? RETURNING *`,
    )
    .bind(...values, timestamp, id);
}

async function update<Row>(
  db: D1Database,
  table: 'events' | 'answers',
  columns: Record<string, (value: never) => unknown>,
  id: string,
  patch: Record<string, unknown>,
  context: string,
): Promise<Row> {
  return run(context, async () => {
    const row = await prepareUpdate(db, table, columns, id, patch).first<Row>();
    if (!row) throw new Error(`${table} not found: ${id}`);
    return row;
  });
}

/**
 * 保存時点の回答から選択を補正する。事前に読み出した回答で上書きしないため、
 * 回答の編集と競合しても、その時点の選択を維持できる。
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

/** 本番の Repository 実装。テストは memoryRepository.ts を使う。 */
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
      if (patch.candidates === undefined) {
        return toEvent(
          await update<EventRow>(db, 'events', EVENT_COLUMNS, eventId, patch, 'updateEvent'),
        );
      }
      return run('updateEvent', async () => {
        const timestamp = new Date().toISOString();
        // batch 全体がトランザクション。補正が失敗すればイベント更新も戻る。
        const [result] = await db.batch<EventRow>([
          prepareUpdate(db, 'events', EVENT_COLUMNS, eventId, patch, timestamp),
          prepareReconcileAnswers(db, eventId, timestamp),
        ]);
        const row = result.results[0];
        if (!row) throw new Error(`events not found: ${eventId}`);
        return toEvent(row);
      });
    },

    async deleteEvent(eventId: string) {
      // 回答は外部キーの ON DELETE CASCADE で一緒に消える
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
      // 並べ替えは operations.ts が createdAt で行う
      const { results } = await run('listAnswersByEvent', () =>
        db.prepare('SELECT * FROM answers WHERE event_id = ?').bind(eventId).all<AnswerRow>(),
      );
      return results.map(toAnswer);
    },

    async updateAnswer(answerId: string, patch: AnswerPatch) {
      const row = await update<AnswerRow>(
        db,
        'answers',
        ANSWER_COLUMNS,
        answerId,
        patch,
        'updateAnswer',
      );
      return toAnswer(row);
    },

    async deleteAnswer(answerId: string) {
      await run('deleteAnswer', () =>
        db.prepare('DELETE FROM answers WHERE id = ?').bind(answerId).run(),
      );
    },
  };
}

/**
 * 保持期間を過ぎたイベントを消す (回答は外部キーで一緒に消える)。Cron Trigger から呼ぶ。
 * 消えるまでの間も operations.ts が期限切れを「存在しない」として扱うので、
 * 実行が遅れたり失敗したりしても利用者からの見え方は変わらない。
 * 戻り値は消した行数 (外部キーで消えた回答を含む)。
 */
export async function deleteExpired(db: D1Database, nowSeconds: number): Promise<number> {
  const result = await db
    .prepare('DELETE FROM events WHERE expires_at <= ?')
    .bind(nowSeconds)
    .run();
  return result.meta.changes;
}
