// @vitest-environment happy-dom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useTodos } from '~/hooks/use-todos';
import { getAll, putAll, putTodos } from '~/lib/todo-db';
import { createFolderFixture, createTodoFixture } from '~/test/fixtures';
import { resetDb } from '~/test/indexed-db';
import type { TodoInput } from '~/types/todo';

const input = (title: string, folderId: string | null = null): TodoInput => ({
  title,
  memo: '',
  priority: 'medium',
  dueDate: null,
  tags: [],
  folderId,
});

afterEach(resetDb);

async function renderLoaded() {
  const hook = renderHook(() => useTodos());
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

describe('useTodos', () => {
  it('persists reordered tasks and appends new tasks after the saved order', async () => {
    const a = createTodoFixture({ customOrder: 0 });
    const b = createTodoFixture({ customOrder: 1 });
    await putTodos([a, b]);
    const { result } = await renderLoaded();
    await act(() => result.current.reorderTodo(b.id, a.id, 'before', [a.id, b.id]));
    expect((await getAll()).todos.find((todo) => todo.id === b.id)?.customOrder).toBe(0);
    await act(() => result.current.addTodo(input('new')));
    expect((await getAll()).todos.find((todo) => todo.title === 'new')?.customOrder).toBe(2);
  });

  it('appends after imported unranked tasks and normalizes extreme ranks safely', async () => {
    const ranked = createTodoFixture({ customOrder: Number.MAX_SAFE_INTEGER - 1 });
    const legacy = createTodoFixture();
    await putTodos([ranked, legacy]);
    const { result } = await renderLoaded();
    await act(() => result.current.addTodo(input('new')));
    const stored = (await getAll()).todos;
    expect(stored.find((todo) => todo.id === ranked.id)?.customOrder).toBe(0);
    expect(stored.find((todo) => todo.id === legacy.id)?.customOrder).toBe(1);
    expect(stored.find((todo) => todo.title === 'new')?.customOrder).toBe(2);
  });
  it('loads todos and folders saved earlier', async () => {
    const folder = createFolderFixture();
    const saved = createTodoFixture({ folderId: folder.id });
    await putAll({ todos: [saved], folders: [folder] });
    const { result } = await renderLoaded();
    expect(result.current.todos).toEqual([saved]);
    expect(result.current.folders).toEqual([folder]);
  });

  it('adds, edits, changes the status of and removes todos and persists them', async () => {
    const { result } = await renderLoaded();

    await act(() => result.current.addTodo(input('a')));
    const id = result.current.todos[0].id;
    await act(() => result.current.editTodo(id, input('b')));
    await act(() => result.current.changeStatus(id, 'in_progress'));

    expect(result.current.todos[0]).toMatchObject({ title: 'b', status: 'in_progress' });
    expect((await getAll()).todos).toEqual(result.current.todos);

    // 削除するとゴミ箱に移り、データは残る
    await act(() => result.current.removeTodo(id));
    expect(result.current.todos).toEqual([]);
    expect(result.current.trash.map((todo) => todo.id)).toEqual([id]);
    const stored = (await getAll()).todos;
    expect(stored).toHaveLength(1);
    expect(stored[0].deletedAt).not.toBeNull();
  });

  it('changes priority and preserves completion and other task fields', async () => {
    const todo = createTodoFixture({
      status: 'done',
      completedAt: '2026-01-01T00:00:00.000Z',
      customOrder: 3,
      memo: '内容を保持',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    await putAll({ folders: [], todos: [todo] });
    const { result } = await renderLoaded();
    await act(() => result.current.changePriority(todo.id, 'high'));
    const saved = (await getAll()).todos[0];
    expect(saved).toEqual({ ...todo, priority: 'high', updatedAt: expect.any(String) });
    expect(saved.updatedAt).not.toBe(todo.updatedAt);
    expect(result.current.todos).toEqual([saved]);
    await act(() => result.current.changePriority(todo.id, 'high'));
    expect((await getAll()).todos).toEqual([saved]);
  });

  it('moves a todo to a folder and back to unfiled', async () => {
    const folder = createFolderFixture();
    const todo = createTodoFixture();
    await putAll({ folders: [folder], todos: [todo] });
    const { result } = await renderLoaded();

    await act(() => result.current.moveTodo(todo.id, folder.id));
    expect(result.current.todos[0].folderId).toBe(folder.id);
    expect((await getAll()).todos[0].folderId).toBe(folder.id);

    await act(() => result.current.moveTodo(todo.id, null));
    expect((await getAll()).todos[0].folderId).toBeNull();
  });

  it('removes only completed todos', async () => {
    await putTodos([createTodoFixture({ status: 'done' }), createTodoFixture({ title: 'open' })]);
    const { result } = await renderLoaded();
    const ids = await act(() => result.current.removeCompleted());
    expect(result.current.todos.map((t) => t.title)).toEqual(['open']);
    expect(result.current.trash.map((t) => t.id)).toEqual(ids);
    expect((await getAll()).todos.filter((t) => t.deletedAt !== null)).toHaveLength(1);
  });

  it('restores, deletes forever, and empties the trash', async () => {
    const a = createTodoFixture({ title: 'a' });
    const b = createTodoFixture({ title: 'b' });
    const c = createTodoFixture({ title: 'c' });
    await putTodos([a, b, c]);
    const { result } = await renderLoaded();

    await act(() => result.current.removeTodo(a.id));
    await act(() => result.current.removeTodo(b.id));
    await act(() => result.current.restoreTodos([a.id]));
    expect(result.current.todos.map((t) => t.title).sort()).toEqual(['a', 'c']);
    expect(result.current.trash.map((t) => t.title)).toEqual(['b']);

    // ゴミ箱の外のタスクは完全に削除しない
    await act(() => result.current.deleteTodosForever([c.id]));
    expect(result.current.todos.map((t) => t.title).sort()).toEqual(['a', 'c']);

    await act(() => result.current.deleteTodosForever([b.id]));
    expect(result.current.trash).toEqual([]);
    expect((await getAll()).todos.map((t) => t.title).sort()).toEqual(['a', 'c']);

    await act(() => result.current.removeTodo(c.id));
    await act(() => result.current.emptyTrash());
    expect((await getAll()).todos.map((t) => t.title)).toEqual(['a']);
    expect(result.current.allTodos.map((t) => t.title)).toEqual(['a']);
  });

  it('deletes todos that have been in the trash for 30 days when loading', async () => {
    const daysAgo = (days: number) =>
      new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const expired = createTodoFixture({ title: 'expired', deletedAt: daysAgo(31) });
    const recent = createTodoFixture({ title: 'recent', deletedAt: daysAgo(29) });
    const active = createTodoFixture({ title: 'active' });
    await putTodos([expired, recent, active]);

    const { result } = await renderLoaded();
    expect(result.current.trash.map((t) => t.title)).toEqual(['recent']);
    expect(result.current.todos.map((t) => t.title)).toEqual(['active']);
    expect((await getAll()).todos.map((t) => t.title).sort()).toEqual(['active', 'recent']);
  });

  it('adds, renames and moves folders', async () => {
    const { result } = await renderLoaded();

    const work = await act(() => result.current.addFolder({ name: '仕事', parentId: null }));
    const project = await act(() => result.current.addFolder({ name: '案件', parentId: work.id }));
    await act(() => result.current.editFolder(project.id, { name: '案件 A', parentId: null }));

    expect(result.current.folders.find((f) => f.id === project.id)).toMatchObject({
      name: '案件 A',
      parentId: null,
    });
    // DB は id 順に返すので順番は比べない
    const stored = (await getAll()).folders;
    expect(stored).toHaveLength(2);
    expect(stored).toEqual(expect.arrayContaining(result.current.folders));
  });

  it('refuses to move a folder under its own descendant', async () => {
    const parent = createFolderFixture();
    const child = createFolderFixture({ parentId: parent.id });
    await putAll({ folders: [parent, child] });
    const { result } = await renderLoaded();

    await act(() => result.current.editFolder(parent.id, { name: 'x', parentId: child.id }));
    expect(result.current.folders.find((f) => f.id === parent.id)).toEqual(parent);
  });

  it('removes a folder with its subfolders and moves their todos to unfiled', async () => {
    const parent = createFolderFixture();
    const child = createFolderFixture({ parentId: parent.id });
    const other = createFolderFixture();
    const inChild = createTodoFixture({ folderId: child.id });
    const inOther = createTodoFixture({ folderId: other.id });
    await putAll({ folders: [parent, child, other], todos: [inChild, inOther] });
    const { result } = await renderLoaded();

    await act(() => result.current.removeFolder(parent.id));

    expect(result.current.folders).toEqual([other]);
    expect(result.current.todos.find((t) => t.id === inChild.id)?.folderId).toBeNull();
    expect(result.current.todos.find((t) => t.id === inOther.id)?.folderId).toBe(other.id);
    expect(await getAll()).toEqual({ todos: result.current.todos, folders: [other] });
  });

  it('imports by merging or replacing', async () => {
    const existing = createTodoFixture({ title: 'existing' });
    await putTodos([existing]);
    const { result } = await renderLoaded();
    const folder = createFolderFixture();
    const incoming = { todos: [createTodoFixture({ folderId: folder.id })], folders: [folder] };

    await act(() => result.current.importData(incoming, 'merge'));
    expect((await getAll()).todos).toHaveLength(2);

    await act(() => result.current.importData(incoming, 'replace'));
    expect(result.current.todos).toEqual(incoming.todos);
    expect(await getAll()).toEqual(incoming);
  });
});
