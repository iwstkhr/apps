// @vitest-environment happy-dom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useTodos } from '~/hooks/use-todos';
import { closeDbForTesting, getAllTodos, putTodos } from '~/lib/todo-db';
import { createTodoFixture } from '~/test/fixtures';
import type { TodoInput } from '~/types/todo';

const input = (title: string): TodoInput => ({
  title,
  memo: '',
  priority: 'medium',
  dueDate: null,
  tags: [],
});

afterEach(async () => {
  await closeDbForTesting();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('todo');
    request.onsuccess = () => resolve();
  });
});

async function renderLoaded() {
  const hook = renderHook(() => useTodos());
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

describe('useTodos', () => {
  it('loads todos saved earlier', async () => {
    const saved = createTodoFixture();
    await putTodos([saved]);
    const { result } = await renderLoaded();
    expect(result.current.todos).toEqual([saved]);
  });

  it('adds, edits, toggles and removes todos and persists them', async () => {
    const { result } = await renderLoaded();

    await act(() => result.current.addTodo(input('a')));
    const id = result.current.todos[0].id;
    await act(() => result.current.editTodo(id, input('b')));
    await act(() => result.current.toggleTodo(id));

    expect(result.current.todos[0]).toMatchObject({ title: 'b', done: true });
    expect(await getAllTodos()).toEqual(result.current.todos);

    await act(() => result.current.removeTodo(id));
    expect(result.current.todos).toEqual([]);
    expect(await getAllTodos()).toEqual([]);
  });

  it('removes only completed todos', async () => {
    await putTodos([createTodoFixture({ done: true }), createTodoFixture({ title: 'open' })]);
    const { result } = await renderLoaded();
    await act(() => result.current.removeCompleted());
    expect(result.current.todos.map((t) => t.title)).toEqual(['open']);
    expect(await getAllTodos()).toHaveLength(1);
  });

  it('imports by merging or replacing', async () => {
    const existing = createTodoFixture({ title: 'existing' });
    await putTodos([existing]);
    const { result } = await renderLoaded();
    const incoming = createTodoFixture({ title: 'incoming' });

    await act(() => result.current.importTodos([incoming], 'merge'));
    expect(await getAllTodos()).toHaveLength(2);

    await act(() => result.current.importTodos([incoming], 'replace'));
    expect(result.current.todos).toEqual([incoming]);
    expect(await getAllTodos()).toEqual([incoming]);
  });
});
