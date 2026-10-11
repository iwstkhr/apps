import { describe, expect, it } from 'vitest';
import { createTodoFixture } from '~/test/fixtures';
import {
  createNextOccurrence,
  createTodo,
  daysUntilPurge,
  getDueStatus,
  moveTodoToFolder,
  moveTodoToTrash,
  nextDueDate,
  normalizeTags,
  parseTagText,
  type Repeat,
  type RepeatFrequency,
  restoreTodoFromTrash,
  setTodoStatus,
  shouldPurge,
  type TodoInput,
  TRASH_RETENTION_DAYS,
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
      {
        title: '  牛乳を買う ',
        memo: 'm',
        priority: 'high',
        dueDate: '2026-10-11',
        tags: ['家'],
        folderId: 'f1',
      },
      NOW,
    );
    expect(todo).toMatchObject({
      title: '牛乳を買う',
      status: 'todo',
      priority: 'high',
      dueDate: '2026-10-11',
      tags: ['家'],
      folderId: 'f1',
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
      { title: 'new', memo: 'x', priority: 'low', dueDate: null, tags: [], folderId: null },
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

describe('moveTodoToFolder', () => {
  it('moves a todo to another folder or to unfiled', () => {
    const todo = createTodoFixture({ folderId: 'a' });
    expect(moveTodoToFolder(todo, 'b', NOW)).toEqual({
      ...todo,
      folderId: 'b',
      updatedAt: NOW.toISOString(),
    });
    expect(moveTodoToFolder(todo, null, NOW).folderId).toBeNull();
  });

  it('returns the same todo when the folder does not change', () => {
    const todo = createTodoFixture({ folderId: 'a' });
    expect(moveTodoToFolder(todo, 'a', NOW)).toBe(todo);
  });
});

describe('toTodo', () => {
  it.each([undefined, null, -1, 0.5, '1', Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'defaults invalid or missing custom order %s',
    (customOrder) => {
      expect(toTodo({ ...createTodoFixture(), customOrder })?.customOrder).toBeNull();
    },
  );

  it('preserves a valid custom order', () => {
    expect(toTodo(createTodoFixture({ customOrder: 2 }))?.customOrder).toBe(2);
  });
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
      folderId: 3,
      completedAt: 'x',
    });
    expect(todo).toMatchObject({
      memo: '',
      priority: 'medium',
      dueDate: null,
      tags: ['a'],
      status: 'todo',
      folderId: null,
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

describe('trash', () => {
  const day = 24 * 60 * 60 * 1000;

  it('moves a todo to the trash and back without losing its folder or status', () => {
    const todo = createTodoFixture({ folderId: 'f1', status: 'in_progress' });
    const trashed = moveTodoToTrash(todo, NOW);
    expect(trashed).toMatchObject({
      folderId: 'f1',
      status: 'in_progress',
      deletedAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
    expect(moveTodoToTrash(trashed, NOW)).toBe(trashed);
    const restored = restoreTodoFromTrash(trashed, NOW);
    expect(restored).toMatchObject({ folderId: 'f1', status: 'in_progress', deletedAt: null });
    expect(restoreTodoFromTrash(restored, NOW)).toBe(restored);
  });

  it(`counts the days until the todo is deleted after ${TRASH_RETENTION_DAYS} days`, () => {
    const trashedAt = (daysAgo: number) =>
      createTodoFixture({ deletedAt: new Date(NOW.getTime() - daysAgo * day).toISOString() });
    expect(daysUntilPurge(trashedAt(0), NOW)).toBe(30);
    expect(daysUntilPurge(trashedAt(29.5), NOW)).toBe(1);
    expect(daysUntilPurge(trashedAt(30), NOW)).toBe(0);
    expect(shouldPurge(trashedAt(29.9), NOW)).toBe(false);
    expect(shouldPurge(trashedAt(31), NOW)).toBe(true);
    expect(shouldPurge(createTodoFixture(), NOW)).toBe(false);
  });

  it('reads deletedAt from stored data and treats it as missing in older data', () => {
    const deletedAt = NOW.toISOString();
    expect(toTodo({ ...createTodoFixture(), deletedAt })?.deletedAt).toBe(deletedAt);
    const { deletedAt: _omitted, ...older } = createTodoFixture();
    expect(toTodo(older)?.deletedAt).toBeNull();
    expect(toTodo({ ...createTodoFixture(), deletedAt: 'nope' })?.deletedAt).toBeNull();
  });
});

describe('repeat', () => {
  const base: Omit<TodoInput, 'dueDate'> = {
    title: '週次レポート',
    memo: '',
    priority: 'medium',
    tags: [],
    folderId: null,
  };
  const repeat = (frequency: RepeatFrequency, anchorDay = 1): Repeat => ({ frequency, anchorDay });

  it('stores the day of the due date and starts today without one', () => {
    expect(createTodo({ ...base, dueDate: '2026-01-31', repeat: 'monthly' }, NOW)).toMatchObject({
      dueDate: '2026-01-31',
      repeat: { frequency: 'monthly', anchorDay: 31 },
    });
    expect(createTodo({ ...base, dueDate: null, repeat: 'daily' }, NOW)).toMatchObject({
      dueDate: toLocalDateString(NOW),
      repeat: { frequency: 'daily', anchorDay: NOW.getDate() },
    });
    expect(createTodo({ ...base, dueDate: '2026-01-31' }, NOW).repeat).toBeNull();
  });

  it('keeps, changes or removes the repeat when editing', () => {
    const todo = createTodo({ ...base, dueDate: '2026-10-09', repeat: 'weekly' }, NOW);
    // Kept when omitted, and anchorDay follows when the due date changes
    expect(updateTodo(todo, { ...base, dueDate: '2026-10-20' }, NOW).repeat).toEqual({
      frequency: 'weekly',
      anchorDay: 20,
    });
    expect(
      updateTodo(todo, { ...base, dueDate: '2026-10-09', repeat: 'yearly' }, NOW).repeat,
    ).toEqual({ frequency: 'yearly', anchorDay: 9 });
    expect(
      updateTodo(todo, { ...base, dueDate: '2026-10-09', repeat: null }, NOW).repeat,
    ).toBeNull();
  });

  it('counts daily, weekly and weekdays from the due date', () => {
    const today = '2026-01-01';
    expect(nextDueDate('2026-10-09', repeat('daily'), today)).toBe('2026-10-10');
    expect(nextDueDate('2026-10-09', repeat('weekly'), today)).toBe('2026-10-16');
    // 2026-10-09 is a Friday and 10-10 a Saturday
    expect(nextDueDate('2026-10-09', repeat('weekdays'), today)).toBe('2026-10-12');
    expect(nextDueDate('2026-10-10', repeat('weekdays'), today)).toBe('2026-10-12');
    expect(nextDueDate('2026-10-12', repeat('weekdays'), today)).toBe('2026-10-13');
    expect(nextDueDate('2026-12-31', repeat('daily'), today)).toBe('2027-01-01');
  });

  it('keeps the day of the month and uses the last day of shorter months', () => {
    const today = '2026-01-01';
    const monthEnd = repeat('monthly', 31);
    expect(nextDueDate('2026-01-31', monthEnd, today)).toBe('2026-02-28');
    expect(nextDueDate('2026-02-28', monthEnd, today)).toBe('2026-03-31');
    expect(nextDueDate('2028-01-31', monthEnd, today)).toBe('2028-02-29');
    expect(nextDueDate('2026-12-15', repeat('monthly', 15), today)).toBe('2027-01-15');
  });

  it('moves February 29 to February 28 in common years and back in leap years', () => {
    const leapDay = repeat('yearly', 29);
    expect(nextDueDate('2028-02-29', leapDay, '2026-01-01')).toBe('2029-02-28');
    expect(nextDueDate('2031-02-28', leapDay, '2026-01-01')).toBe('2032-02-29');
  });

  it('skips past dates until the next one is today or later', () => {
    expect(nextDueDate('2026-09-01', repeat('weekly'), '2026-10-10')).toBe('2026-10-13');
    expect(nextDueDate('2026-10-09', repeat('daily'), '2026-10-10')).toBe('2026-10-10');
  });

  it('creates the next occurrence with the same content as a new open todo', () => {
    const todo = createTodoFixture({
      title: '週次レポート',
      memo: 'メモ',
      priority: 'high',
      tags: ['定例'],
      folderId: 'f1',
      status: 'done',
      dueDate: '2026-10-09',
      customOrder: 3,
      completedAt: NOW.toISOString(),
      repeat: repeat('weekly', 9),
    });
    const next = createNextOccurrence(todo, NOW);
    expect(next).toMatchObject({
      title: '週次レポート',
      memo: 'メモ',
      priority: 'high',
      tags: ['定例'],
      folderId: 'f1',
      status: 'todo',
      dueDate: '2026-10-16',
      customOrder: null,
      createdAt: NOW.toISOString(),
      completedAt: null,
      deletedAt: null,
      repeat: repeat('weekly', 9),
    });
    expect(next?.id).not.toBe(todo.id);
    expect(createNextOccurrence(createTodoFixture({ dueDate: '2026-10-09' }), NOW)).toBeNull();
  });

  it('reads repeat from stored data and treats it as missing in older data', () => {
    const stored = {
      ...createTodoFixture({ dueDate: '2026-10-09' }),
      repeat: { frequency: 'weekly', anchorDay: 9 },
    };
    expect(toTodo(stored)?.repeat).toEqual({ frequency: 'weekly', anchorDay: 9 });
    const { repeat: _omitted, ...older } = stored;
    expect(toTodo(older)?.repeat).toBeNull();
    expect(toTodo({ ...stored, repeat: { frequency: 'hourly', anchorDay: 9 } })?.repeat).toBeNull();
    // A broken anchorDay is filled from the due date's day, and without a due date it does not repeat
    expect(toTodo({ ...stored, repeat: { frequency: 'monthly', anchorDay: 40 } })?.repeat).toEqual({
      frequency: 'monthly',
      anchorDay: 9,
    });
    expect(toTodo({ ...stored, dueDate: null })?.repeat).toBeNull();
  });
});
