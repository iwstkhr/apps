import type { Todo } from '~/types/todo';

let sequence = 0;

export function createTodoFixture(overrides: Partial<Todo> = {}): Todo {
  sequence++;
  return {
    id: `todo-${sequence}`,
    title: `TODO ${sequence}`,
    memo: '',
    done: false,
    priority: 'medium',
    dueDate: null,
    tags: [],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}
