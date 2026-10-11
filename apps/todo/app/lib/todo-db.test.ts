import { afterEach, describe, expect, it } from 'vitest';
import { setLanguage } from '~/lib/i18n';
import {
  closeDbForTesting,
  deleteFolders,
  deleteTodos,
  getAll,
  putAll,
  putTodos,
  replaceAll,
} from '~/lib/todo-db';
import { createFolderFixture, createTodoFixture } from '~/test/fixtures';
import { resetDb } from '~/test/indexed-db';
import type { Folder } from '~/types/folder';
import type { Todo } from '~/types/todo';

afterEach(resetDb);

describe('todo-db', () => {
  it('stores, updates and deletes todos', async () => {
    const a = createTodoFixture();
    const b = createTodoFixture();
    await putTodos([a, b]);
    expect((await getAll()).todos).toHaveLength(2);

    await putTodos([{ ...a, title: 'changed' }]);
    await deleteTodos([b.id]);
    expect((await getAll()).todos).toEqual([{ ...a, title: 'changed' }]);
  });

  it('stores folders and todos together', async () => {
    const folder = createFolderFixture();
    const todo = createTodoFixture({ folderId: folder.id });
    await putAll({ folders: [folder], todos: [todo] });
    expect(await getAll()).toEqual({ folders: [folder], todos: [todo] });
  });

  it('deletes folders and rewrites their todos in one go', async () => {
    const folder = createFolderFixture();
    const todo = createTodoFixture({ folderId: folder.id });
    await putAll({ folders: [folder], todos: [todo] });

    await deleteFolders([folder.id], [{ ...todo, folderId: null }]);
    expect(await getAll()).toEqual({ folders: [], todos: [{ ...todo, folderId: null }] });
  });

  it('replaces everything', async () => {
    await putAll({ folders: [createFolderFixture()], todos: [createTodoFixture()] });
    const folder = createFolderFixture();
    const todo = createTodoFixture();
    await replaceAll({ folders: [folder], todos: [todo] });
    expect(await getAll()).toEqual({ folders: [folder], todos: [todo] });
  });

  it('normalizes stored records and drops broken ones', async () => {
    const valid = createTodoFixture({ tags: [' a ', 'a'] });
    const folder = createFolderFixture({ name: ' 仕事 ' });
    // 壊れたデータが保存されていても読み込みで落ちないこと
    await putAll({
      todos: [valid, { id: 'broken' } as unknown as Todo],
      folders: [folder, { id: 'broken' } as unknown as Folder],
    });
    expect(await getAll()).toEqual({
      todos: [{ ...valid, tags: ['a'] }],
      folders: [{ ...folder, name: '仕事' }],
    });
  });

  describe('sample data', () => {
    // setup.ts が作った空のデータベースを消して、初めて開く状態にする
    async function deleteDb() {
      await closeDbForTesting();
      await new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase('todo');
        request.onsuccess = () => resolve();
      });
    }

    it('adds samples when the database is created for the first time', async () => {
      await deleteDb();
      setLanguage('en');
      const { todos, folders } = await getAll();
      expect(todos.length).toBeGreaterThan(0);
      expect(folders.map((folder) => folder.name)).toContain('Work');
    });

    it('does not add samples again after they are deleted', async () => {
      await deleteDb();
      const { todos, folders } = await getAll();
      await replaceAll({ todos: [], folders: [] });
      await closeDbForTesting();
      expect(await getAll()).toEqual({ todos: [], folders: [] });
      expect(todos.length + folders.length).toBeGreaterThan(0);
    });

    it('does not add samples to an existing database', async () => {
      expect(await getAll()).toEqual({ todos: [], folders: [] });
    });
  });
});
