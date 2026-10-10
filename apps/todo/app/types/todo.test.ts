import { describe, expect, it } from 'vitest';
import { createTodoFixture } from '~/test/fixtures';
import {
  createTodo,
  getDueStatus,
  normalizeTags,
  parseTagText,
  setTodoStatus,
  toLocalDateString,
  toTodo,
  updateTodo,
} from '~/types/todo';

const NOW = new Date('2026-10-10T03:00:00.000Z');

describe('tags', () => {
  it('trims, drops empty entries and de-duplicates', () => {
    expect(normalizeTags([' a ', '', 'b', 'a'])).toEqual(['a', 'b']);
  });

  it('splits on ASCII and Japanese commas', () => {
    expect(parseTagText('仕事, 家、買い物，仕事')).toEqual(['仕事', '家', '買い物']);
  });
});

describe('createTodo / updateTodo / setTodoStatus', () => {
  it('creates an open todo with timestamps', () => {
    const todo = createTodo(
      { title: '  牛乳を買う ', memo: 'm', priority: 'high', dueDate: '2026-10-11', tags: ['家'] },
      NOW,
    );
    expect(todo).toMatchObject({
      title: '牛乳を買う',
      status: 'todo',
      priority: 'high',
      dueDate: '2026-10-11',
      tags: ['家'],
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      completedAt: null,
    });
    expect(todo.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('updates fields but keeps id and createdAt', () => {
    const todo = createTodoFixture();
    const updated = updateTodo(
      todo,
      { title: 'new', memo: 'x', priority: 'low', dueDate: null, tags: [] },
      NOW,
    );
    expect(updated).toMatchObject({ id: todo.id, createdAt: todo.createdAt, title: 'new' });
    expect(updated.updatedAt).toBe(NOW.toISOString());
  });

  it('records and clears completedAt', () => {
    const done = setTodoStatus(createTodoFixture(), 'done', NOW);
    expect(done).toMatchObject({ status: 'done', completedAt: NOW.toISOString() });
    expect(setTodoStatus(done, 'on_hold', NOW)).toMatchObject({
      status: 'on_hold',
      completedAt: null,
    });
  });

  it('returns the same todo when the status does not change', () => {
    const todo = createTodoFixture({ status: 'in_progress' });
    expect(setTodoStatus(todo, 'in_progress', NOW)).toBe(todo);
  });
});

describe('toTodo', () => {
  it('accepts a valid todo and drops unknown fields', () => {
    const todo = createTodoFixture({ tags: ['a'] });
    expect(toTodo({ ...todo, extra: 1 })).toEqual(todo);
  });

  it.each([
    ['null', null],
    ['missing id', { ...createTodoFixture(), id: '' }],
    ['blank title', { ...createTodoFixture(), title: '  ' }],
    ['bad createdAt', { ...createTodoFixture(), createdAt: 'nope' }],
  ])('rejects %s', (_label, value) => {
    expect(toTodo(value)).toBeNull();
  });

  it('fills defaults for invalid optional fields', () => {
    const todo = toTodo({
      ...createTodoFixture(),
      memo: 1,
      priority: 'urgent',
      dueDate: '10/11',
      tags: ['a', 2, ' a '],
      status: 'started',
      completedAt: 'x',
    });
    expect(todo).toMatchObject({
      memo: '',
      priority: 'medium',
      dueDate: null,
      tags: ['a'],
      status: 'todo',
      completedAt: null,
    });
  });
});

describe('dates', () => {
  it('formats local dates', () => {
    expect(toLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('reports due status', () => {
    const today = '2026-10-10';
    expect(getDueStatus(createTodoFixture({ dueDate: '2026-10-09' }), today)).toBe('overdue');
    expect(getDueStatus(createTodoFixture({ dueDate: today }), today)).toBe('today');
    expect(getDueStatus(createTodoFixture({ dueDate: '2026-10-11' }), today)).toBe('upcoming');
    expect(getDueStatus(createTodoFixture(), today)).toBe('none');
    expect(getDueStatus(createTodoFixture({ dueDate: '2026-10-09', status: 'done' }), today)).toBe(
      'none',
    );
  });
});
