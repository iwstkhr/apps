import { describe, expect, it } from 'vitest';
import { applyFilters, DEFAULT_FILTERS } from '~/lib/todo-filters';
import { compareCustomOrder, reorderTodos } from '~/lib/todo-order';
import { createTodoFixture } from '~/test/fixtures';

const a = createTodoFixture({ id: 'a', customOrder: 0 });
const hidden = createTodoFixture({ id: 'hidden', customOrder: 1 });
const b = createTodoFixture({ id: 'b', customOrder: 2, status: 'done' });
const c = createTodoFixture({ id: 'c', customOrder: 3 });
const ids = (todos: ReturnType<typeof reorderTodos>) =>
  [...todos].sort(compareCustomOrder).map((todo) => todo.id);

describe('custom order', () => {
  it('moves visible tasks while keeping hidden slots and saving changed timestamps', () => {
    const now = new Date('2026-10-10T12:00:00Z');
    const next = reorderTodos([a, hidden, b, c], ['a', 'b', 'c'], 'c', 'a', 'before', now);
    expect(ids(next)).toEqual(['c', 'hidden', 'a', 'b']);
    expect(next[1]).toBe(hidden);
    expect(next.find((todo) => todo.id === 'c')?.updatedAt).toBe(now.toISOString());
    expect(ids(reorderTodos(next, ['a', 'b', 'c'], 'c', 'b', 'after'))).toEqual([
      'a',
      'hidden',
      'b',
      'c',
    ]);
  });

  it('ignores invalid, hidden, self, and unchanged moves', () => {
    for (const [moved, target] of [
      ['a', 'a'],
      ['missing', 'b'],
      ['hidden', 'b'],
      ['a', 'hidden'],
      ['a', 'b'],
    ]) {
      expect(reorderTodos([a, hidden, b], ['a', 'b'], moved, target, 'before')).toEqual([
        a,
        hidden,
        b,
      ]);
    }
  });

  it('honors a custom order across statuses, without changing other sorts', () => {
    const todos = [
      { ...b, customOrder: 0 },
      { ...a, customOrder: 1 },
    ];
    expect(
      applyFilters(todos, { ...DEFAULT_FILTERS, sort: 'custom' }).map((todo) => todo.id),
    ).toEqual(['b', 'a']);
    expect(applyFilters(todos, DEFAULT_FILTERS).map((todo) => todo.id)).toEqual(['a', 'b']);
  });

  it('initializes legacy records in a deterministic order and does not mutate them', () => {
    const legacy = [a, b, c].map((todo) => ({ ...todo, customOrder: null }));
    const next = reorderTodos(legacy, ['a', 'b', 'c'], 'c', 'a', 'before');
    expect(ids(next)).toEqual(['c', 'a', 'b']);
    expect(legacy.every((todo) => todo.customOrder === null)).toBe(true);
  });
});
