import type { Folder } from '~/types/folder';
import type { Todo } from '~/types/todo';

let sequence = 0;

export function createTodoFixture(overrides: Partial<Todo> = {}): Todo {
  sequence++;
  return {
    id: `todo-${sequence}`,
    title: `TODO ${sequence}`,
    memo: '',
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    tags: [],
    folderId: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

export function createFolderFixture(overrides: Partial<Folder> = {}): Folder {
  sequence++;
  return {
    id: `folder-${sequence}`,
    name: `フォルダ ${sequence}`,
    parentId: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}
