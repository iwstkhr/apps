import { afterEach, describe, expect, it } from 'vitest';
import {
  closeDbForTesting,
  deleteTodos,
  getAllTodos,
  putTodos,
  replaceAllTodos,
} from '~/lib/todo-db';
import { createTodoFixture } from '~/test/fixtures';

afterEach(async () => {
  await closeDbForTesting();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('todo');
    request.onsuccess = () => resolve();
  });
});

describe('todo-db', () => {
  it('stores, updates and deletes todos', async () => {
    const a = createTodoFixture();
    const b = createTodoFixture();
    await putTodos([a, b]);
    expect(await getAllTodos()).toHaveLength(2);

    await putTodos([{ ...a, title: 'changed' }]);
    await deleteTodos([b.id]);
    expect(await getAllTodos()).toEqual([{ ...a, title: 'changed' }]);
  });

  it('replaces everything', async () => {
    await putTodos([createTodoFixture(), createTodoFixture()]);
    const c = createTodoFixture();
    await replaceAllTodos([c]);
    expect(await getAllTodos()).toEqual([c]);
  });
});
