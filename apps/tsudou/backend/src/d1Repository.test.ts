import { readdirSync, readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { createD1Repository, deleteExpired } from './d1Repository';
import type { NewAnswer, NewEvent, Repository } from './repository';

/**
 * wrangler.jsonc の D1 バインディングを、ローカルの D1 (workerd) で動かして検証する。
 * データはメモリにだけ置き (persist: false)、マイグレーションはテストの開始時に流す。
 */
const MIGRATIONS_DIR = new URL('../migrations/', import.meta.url);

let proxy: Awaited<ReturnType<typeof getPlatformProxy<Env>>>;
let db: D1Database;
let repo: Repository;

beforeAll(async () => {
  proxy = await getPlatformProxy<Env>({ persist: false });
  db = proxy.env.DB;
  for (const file of readdirSync(MIGRATIONS_DIR).sort()) {
    const sql = readFileSync(new URL(file, MIGRATIONS_DIR), 'utf8').replace(/--.*$/gm, '');
    const statements = sql
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean);
    await db.batch(statements.map((statement) => db.prepare(statement)));
  }
  repo = createD1Repository(db);
}, 30_000);

afterAll(async () => {
  await proxy?.dispose();
});

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM answers'), db.prepare('DELETE FROM events')]);
});

const newEvent = (overrides: Partial<NewEvent> = {}): NewEvent => ({
  id: 'event-1',
  title: '忘年会',
  fee: null,
  memo: null,
  candidates: [{ id: 'c1', startAt: '2030-01-01T10:00:00.000Z' }],
  closed: false,
  manageTokenHash: 'hash',
  expiresAt: 2_000_000_000,
  ...overrides,
});

const newAnswer = (overrides: Partial<NewAnswer> = {}): NewAnswer => ({
  id: 'answer-1',
  eventId: 'event-1',
  name: '山田',
  message: null,
  choices: [{ candidateId: 'c1', status: 'YES' }],
  editTokenHash: 'edit-hash',
  expiresAt: 2_000_000_000,
  ...overrides,
});

describe('d1Repository', () => {
  it('イベントを保存して同じ形で読み出せる', async () => {
    const created = await repo.createEvent(newEvent({ fee: 0, memo: 'メモ' }));
    expect(created.createdAt).toBe(created.updatedAt);

    const event = await repo.getEvent('event-1');
    expect(event).toEqual(created);
    expect(event).toMatchObject({
      fee: 0,
      memo: 'メモ',
      closed: false,
      candidates: [{ id: 'c1', startAt: '2030-01-01T10:00:00.000Z' }],
      manageTokenHash: 'hash',
      expiresAt: 2_000_000_000,
    });
    expect(await repo.getEvent('missing')).toBeNull();
  });

  it('イベントの更新は渡した項目だけを変え、null で消せる', async () => {
    await repo.createEvent(newEvent({ fee: 1000, memo: 'メモ' }));

    const updated = await repo.updateEvent('event-1', { closed: true, memo: null });
    expect(updated).toMatchObject({ title: '忘年会', fee: 1000, memo: null, closed: true });
    expect(await repo.getEvent('event-1')).toEqual(updated);
  });

  it('存在しない行の更新は INTERNAL', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(repo.updateEvent('missing', { title: 'x' })).rejects.toMatchObject({
      code: 'INTERNAL',
    });
    spy.mockRestore();
  });

  it('回答を作成・一覧・更新・削除できる', async () => {
    await repo.createEvent(newEvent());
    await repo.createEvent(newEvent({ id: 'event-2' }));
    await repo.createAnswer(newAnswer());
    await repo.createAnswer(newAnswer({ id: 'answer-2', name: '佐藤' }));
    await repo.createAnswer(newAnswer({ id: 'answer-3', eventId: 'event-2' }));

    const answers = await repo.listAnswersByEvent('event-1');
    expect(answers.map((answer) => answer.id).sort()).toEqual(['answer-1', 'answer-2']);

    const updated = await repo.updateAnswer('answer-1', {
      message: 'よろしく',
      choices: [{ candidateId: 'c1', status: 'NO' }],
    });
    expect(updated).toMatchObject({ name: '山田', message: 'よろしく' });
    expect((await repo.getAnswer('answer-1'))?.choices).toEqual([
      { candidateId: 'c1', status: 'NO' },
    ]);

    await repo.deleteAnswer('answer-1');
    expect(await repo.getAnswer('answer-1')).toBeNull();
  });

  it('同じイベントに同じ名前の回答は DUPLICATE_NAME (別のイベントなら置ける)', async () => {
    await repo.createEvent(newEvent());
    await repo.createEvent(newEvent({ id: 'event-2' }));
    await repo.createAnswer(newAnswer());
    await repo.createAnswer(newAnswer({ id: 'answer-3', eventId: 'event-2' }));

    await expect(repo.createAnswer(newAnswer({ id: 'answer-2' }))).rejects.toMatchObject({
      code: 'DUPLICATE_NAME',
    });

    await repo.createAnswer(newAnswer({ id: 'answer-2', name: '佐藤' }));
    await expect(repo.updateAnswer('answer-2', { name: '山田' })).rejects.toMatchObject({
      code: 'DUPLICATE_NAME',
    });
  });

  it('イベントを消すと回答も消える', async () => {
    await repo.createEvent(newEvent());
    await repo.createAnswer(newAnswer());

    await repo.deleteEvent('event-1');
    expect(await repo.getEvent('event-1')).toBeNull();
    expect(await repo.getAnswer('answer-1')).toBeNull();
  });

  it('deleteExpired は期限を過ぎたイベントとその回答だけを消す', async () => {
    await repo.createEvent(newEvent({ id: 'old', expiresAt: 1000 }));
    await repo.createEvent(newEvent({ id: 'new', expiresAt: 3000 }));
    await repo.createAnswer(newAnswer({ eventId: 'old', expiresAt: 1000 }));

    // イベント 1 件と、外部キーで消えた回答 1 件
    expect(await deleteExpired(db, 2000)).toBe(2);
    expect(await repo.getEvent('old')).toBeNull();
    expect(await repo.getAnswer('answer-1')).toBeNull();
    expect(await repo.getEvent('new')).not.toBeNull();
  });
});
