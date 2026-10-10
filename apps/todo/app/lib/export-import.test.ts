import { describe, expect, it } from 'vitest';
import {
  createExport,
  EXPORT_VERSION,
  exportFileName,
  ImportError,
  mergeTodos,
  parseImport,
} from '~/lib/export-import';
import { createTodoFixture } from '~/test/fixtures';

describe('export', () => {
  it('wraps todos with metadata', () => {
    const todo = createTodoFixture();
    const now = new Date('2026-10-10T00:00:00.000Z');
    expect(createExport([todo], now)).toEqual({
      app: 'todo',
      version: EXPORT_VERSION,
      exportedAt: now.toISOString(),
      todos: [todo],
    });
  });

  it('names the file after the local date', () => {
    expect(exportFileName(new Date(2026, 9, 10, 12))).toBe('todo-export-20261010.json');
  });
});

describe('parseImport', () => {
  it('round-trips an export', () => {
    const todos = [createTodoFixture(), createTodoFixture({ status: 'on_hold', tags: ['x'] })];
    expect(parseImport(JSON.stringify(createExport(todos)))).toEqual({ todos, skipped: 0 });
  });

  it('skips invalid items and keeps the newer duplicate', () => {
    const older = createTodoFixture({ id: 'dup', title: 'old' });
    const newer = { ...older, title: 'new', updatedAt: '2026-10-05T00:00:00.000Z' };
    const result = parseImport(
      JSON.stringify({ app: 'todo', version: 1, todos: [older, { id: 1 }, newer] }),
    );
    expect(result.todos.map((t) => t.title)).toEqual(['new']);
    expect(result.skipped).toBe(2);
  });

  it.each([
    ['broken JSON', '{', 'JSON として読み込めませんでした。'],
    ['an array', '[]', 'このアプリでエクスポートしたファイルではありません。'],
    [
      'another app',
      '{"app":"x","version":1,"todos":[]}',
      'このアプリでエクスポートしたファイルではありません。',
    ],
    [
      'a newer version',
      '{"app":"todo","version":2,"todos":[]}',
      '対応していない形式のバージョンです (2)。',
    ],
  ])('rejects %s', (_label, text, message) => {
    expect(() => parseImport(text)).toThrow(new ImportError(message));
  });
});

describe('mergeTodos', () => {
  it('adds new todos and keeps the newer of matching ids', () => {
    const kept = createTodoFixture({
      id: 'a',
      updatedAt: '2026-10-05T00:00:00.000Z',
      title: 'mine',
    });
    const replaced = createTodoFixture({ id: 'b', title: 'old' });
    const incoming = [
      { ...kept, title: 'theirs', updatedAt: '2026-10-01T00:00:00.000Z' },
      { ...replaced, title: 'new', updatedAt: '2026-10-09T00:00:00.000Z' },
      createTodoFixture({ id: 'c', title: 'added' }),
    ];
    expect(mergeTodos([kept, replaced], incoming).map((t) => t.title)).toEqual([
      'mine',
      'new',
      'added',
    ]);
  });
});
