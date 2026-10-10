import { describe, expect, it } from 'vitest';
import {
  createExport,
  EXPORT_VERSION,
  exportFileName,
  ImportError,
  mergeData,
  parseImport,
} from '~/lib/export-import';
import { createFolderFixture, createTodoFixture } from '~/test/fixtures';

describe('export', () => {
  it('wraps todos and folders with metadata', () => {
    const folder = createFolderFixture();
    const todo = createTodoFixture({ folderId: folder.id });
    const now = new Date('2026-10-10T00:00:00.000Z');
    expect(createExport({ todos: [todo], folders: [folder] }, now)).toEqual({
      app: 'todo',
      version: EXPORT_VERSION,
      exportedAt: now.toISOString(),
      folders: [folder],
      todos: [todo],
    });
  });

  it('names the file after the local date', () => {
    expect(exportFileName(new Date(2026, 9, 10, 12))).toBe('todo-export-20261010.json');
  });
});

describe('parseImport', () => {
  it('round-trips an export', () => {
    const parent = createFolderFixture();
    const child = createFolderFixture({ parentId: parent.id, color: '#2563eb' });
    const todos = [
      createTodoFixture({ folderId: child.id, customOrder: 2 }),
      createTodoFixture({ status: 'on_hold', tags: ['x'] }),
    ];
    const folders = [parent, child];
    expect(parseImport(JSON.stringify(createExport({ todos, folders })))).toEqual({
      todos,
      folders,
      skipped: 0,
    });
  });

  it('treats a file without folders as having none', () => {
    const todo = createTodoFixture();
    expect(parseImport(JSON.stringify({ app: 'todo', version: 1, todos: [todo] }))).toEqual({
      todos: [todo],
      folders: [],
      skipped: 0,
    });
  });

  it('skips invalid items and keeps the newer duplicate', () => {
    const older = createTodoFixture({ id: 'dup', title: 'old' });
    const newer = { ...older, title: 'new', updatedAt: '2026-10-05T00:00:00.000Z' };
    const result = parseImport(
      JSON.stringify({
        app: 'todo',
        version: 1,
        todos: [older, { id: 1 }, newer],
        folders: [{ id: 'no-name' }],
      }),
    );
    expect(result.todos.map((t) => t.title)).toEqual(['new']);
    expect(result.skipped).toBe(3);
  });

  it('repairs references to missing folders', () => {
    const orphan = createFolderFixture({ parentId: 'missing' });
    const todo = createTodoFixture({ folderId: 'missing' });
    const result = parseImport(
      JSON.stringify({ app: 'todo', version: 1, todos: [todo], folders: [orphan] }),
    );
    expect(result.folders).toEqual([{ ...orphan, parentId: null }]);
    expect(result.todos).toEqual([{ ...todo, folderId: null }]);
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

describe('mergeData', () => {
  it('adds new items and keeps the newer of matching ids', () => {
    const kept = createTodoFixture({
      id: 'a',
      updatedAt: '2026-10-05T00:00:00.000Z',
      title: 'mine',
    });
    const replaced = createTodoFixture({ id: 'b', title: 'old' });
    const folder = createFolderFixture({ name: 'old' });
    const incoming = {
      todos: [
        { ...kept, title: 'theirs', updatedAt: '2026-10-01T00:00:00.000Z' },
        { ...replaced, title: 'new', updatedAt: '2026-10-09T00:00:00.000Z' },
        createTodoFixture({ id: 'c', title: 'added' }),
      ],
      folders: [{ ...folder, name: 'new', updatedAt: '2026-10-09T00:00:00.000Z' }],
    };
    const merged = mergeData({ todos: [kept, replaced], folders: [folder] }, incoming);
    expect(merged.todos.map((t) => t.title)).toEqual(['mine', 'new', 'added']);
    expect(merged.folders.map((f) => f.name)).toEqual(['new']);
  });
});
