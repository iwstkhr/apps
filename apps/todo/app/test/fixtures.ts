import { DEFAULT_FOLDER_COLOR, type Folder } from '~/types/folder';
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
    customOrder: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    completedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

export function createFolderFixture(overrides: Partial<Folder> = {}): Folder {
  sequence++;
  return {
    id: `folder-${sequence}`,
    name: `フォルダ ${sequence}`,
    color: DEFAULT_FOLDER_COLOR,
    parentId: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}
