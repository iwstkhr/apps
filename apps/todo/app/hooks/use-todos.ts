import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { mergeData } from '~/lib/export-import';
import {
  type FolderDropPosition,
  getSubtreeIds,
  moveFolder as moveFolderInTree,
  wouldCreateCycle,
} from '~/lib/folder-tree';
import { t } from '~/lib/i18n';
import {
  deleteFolders,
  deleteTodos,
  getAll,
  putAll,
  putAndDeleteTodos,
  putTodos,
  replaceAll,
  type StoredData,
} from '~/lib/todo-db';
import { compareCustomOrder, type DropPosition, reorderTodos } from '~/lib/todo-order';
import { createFolder, type Folder, type FolderInput, updateFolder } from '~/types/folder';
import {
  createNextOccurrence,
  createTodo,
  isTrashed,
  moveTodoToFolder,
  moveTodoToTrash,
  type Priority,
  restoreTodoFromTrash,
  setTodoStatus,
  shouldPurge,
  type Todo,
  type TodoInput,
  type TodoStatus,
  updateTodo,
} from '~/types/todo';

// Reload when another tab in the same browser makes changes
const CHANNEL_NAME = 'todo-changes';

export type ImportMode = 'replace' | 'merge';

export interface UseTodos {
  /** Tasks not in the trash */
  todos: Todo[];
  /** Tasks in the trash */
  trash: Todo[];
  /** All tasks, including the trash (for export) */
  allTodos: Todo[];
  folders: Folder[];
  isLoading: boolean;
  error: string | null;
  addTodo: (input: TodoInput) => Promise<void>;
  editTodo: (id: string, input: TodoInput) => Promise<void>;
  /** Completing a repeating task creates and returns the next occurrence. null if none is created */
  changeStatus: (id: string, status: TodoStatus) => Promise<Todo | null>;
  /** Undo completing a repeating task. previous is the task before completion, nextId the created next occurrence */
  undoRepeat: (previous: Todo, nextId: string) => Promise<void>;
  changePriority: (id: string, priority: Priority) => Promise<void>;
  /** A null dueDate removes the due date */
  changeDueDate: (id: string, dueDate: string | null) => Promise<void>;
  removeTag: (id: string, tag: string) => Promise<void>;
  /** A null folderId moves it to 未分類 */
  moveTodo: (id: string, folderId: string | null) => Promise<void>;
  reorderTodo: (
    id: string,
    targetId: string,
    position: DropPosition,
    visibleIds: readonly string[],
  ) => Promise<void>;
  /** Move to the trash */
  removeTodo: (id: string) => Promise<void>;
  /**
   * Move completed tasks to the trash and return the moved ids (for undo).
   * When scopeIds is given, only tasks within it (those in the folder being viewed) are affected
   */
  removeCompleted: (scopeIds?: readonly string[]) => Promise<string[]>;
  /** Restore from the trash and return how many were actually restored (0 if already deleted forever) */
  restoreTodos: (ids: readonly string[]) => Promise<number>;
  /** Delete forever from the trash */
  deleteTodosForever: (ids: readonly string[]) => Promise<void>;
  emptyTrash: () => Promise<void>;
  /** Returns the created folder */
  addFolder: (input: FolderInput) => Promise<Folder>;
  editFolder: (id: string, input: FolderInput) => Promise<void>;
  /** Move a folder next to or into the target folder (null targetId moves it to the end of the top level) */
  moveFolder: (id: string, targetId: string | null, position: FolderDropPosition) => Promise<void>;
  /** Delete a folder and its descendants, moving the todos inside to 未分類 */
  removeFolder: (id: string) => Promise<void>;
  importData: (incoming: StoredData, mode: ImportMode) => Promise<void>;
}

const EMPTY: StoredData = { todos: [], folders: [] };

/**
 * Append a new task to the end of the list. If the custom order is in use, renumber the current order
 * from 0 before giving it the last number. Also returns the tasks that need saving again (including the new one).
 */
function appendTodo(current: readonly Todo[], todo: Todo): { next: Todo[]; changed: Todo[] } {
  let normalized: readonly Todo[] = current;
  let added = todo;
  if (current.some((item) => item.customOrder !== null)) {
    const ranks = new Map(
      [...current].sort(compareCustomOrder).map((item, index) => [item.id, index]),
    );
    normalized = current.map((item) =>
      item.customOrder === ranks.get(item.id)
        ? item
        : { ...item, customOrder: ranks.get(item.id) ?? 0, updatedAt: todo.createdAt },
    );
    added = { ...todo, customOrder: current.length };
  }
  const changed = normalized.filter((item, index) => item !== current[index]);
  return { next: [...normalized, added], changed: [...changed, added] };
}

export function useTodos(): UseTodos {
  const [data, setData] = useState<StoredData>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // So that async work always reads the latest data
  const dataRef = useRef<StoredData>(EMPTY);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const apply = useCallback((next: StoredData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  const reload = useCallback(async () => {
    try {
      const loaded = await getAll();
      // Delete forever, on open, tasks whose time in the trash has expired
      const expired = loaded.todos.filter((todo) => shouldPurge(todo)).map((todo) => todo.id);
      if (expired.length > 0) {
        const ids = new Set(expired);
        loaded.todos = loaded.todos.filter((todo) => !ids.has(todo.id));
        // Show the loaded data even if deletion fails (retry the next time the app opens)
        void deleteTodos(expired).catch(() => {});
      }
      apply(loaded);
      setError(null);
    } catch {
      setError(
        t('データを読み込めませんでした。ブラウザの設定で保存が許可されているか確認してください。'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    void reload();
    // Request persistence so the browser does not clear storage on its own (behavior is the same if refused)
    void navigator.storage?.persist?.().catch(() => {});

    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => void reload();
    channelRef.current = channel;
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [reload]);

  /** Update the UI first, then save. If saving fails, revert to the DB contents. */
  const commit = useCallback(
    async (next: StoredData, persist: () => Promise<void>) => {
      apply(next);
      try {
        await persist();
        setError(null);
        channelRef.current?.postMessage('changed');
      } catch {
        setError(t('保存できませんでした。もう一度お試しください。'));
        await reload();
      }
    },
    [apply, reload],
  );

  const setTodos = useCallback(
    (todos: Todo[], persist: () => Promise<void>) => commit({ ...dataRef.current, todos }, persist),
    [commit],
  );

  const addTodo = useCallback(
    async (input: TodoInput) => {
      const { next, changed } = appendTodo(dataRef.current.todos, createTodo(input));
      await setTodos(next, () => putTodos(changed));
    },
    [setTodos],
  );

  const replaceOne = useCallback(
    async (id: string, change: (todo: Todo) => Todo) => {
      const current = dataRef.current.todos.find((todo) => todo.id === id);
      if (!current) return;
      const updated = change(current);
      if (updated === current) return;
      await setTodos(
        dataRef.current.todos.map((todo) => (todo.id === id ? updated : todo)),
        () => putTodos([updated]),
      );
    },
    [setTodos],
  );

  const editTodo = useCallback(
    (id: string, input: TodoInput) => replaceOne(id, (todo) => updateTodo(todo, input)),
    [replaceOne],
  );

  const changeStatus = useCallback(
    async (id: string, status: TodoStatus) => {
      const current = dataRef.current.todos.find((todo) => todo.id === id);
      const nextOccurrence =
        current && status === 'done' && current.status !== 'done'
          ? createNextOccurrence(current)
          : null;
      if (!current || !nextOccurrence) {
        await replaceOne(id, (todo) => setTodoStatus(todo, status));
        return null;
      }
      // Repeating carries over to the next occurrence. It is removed from the completed one, so unchecking and checking again does not create a duplicate
      const completed: Todo = { ...setTodoStatus(current, status), repeat: null };
      const { next, changed } = appendTodo(
        dataRef.current.todos.map((todo) => (todo.id === id ? completed : todo)),
        nextOccurrence,
      );
      const saved = changed.some((todo) => todo.id === id) ? changed : [completed, ...changed];
      await setTodos(next, () => putTodos(saved));
      return next.at(-1) ?? null;
    },
    [replaceOne, setTodos],
  );

  const undoRepeat = useCallback(
    async (previous: Todo, nextId: string) => {
      const current = dataRef.current.todos.find((todo) => todo.id === previous.id);
      const restored: Todo[] = current
        ? [
            {
              ...current,
              status: previous.status,
              completedAt: previous.completedAt,
              repeat: previous.repeat,
              updatedAt: new Date().toISOString(),
            },
          ]
        : [];
      const hasNext = dataRef.current.todos.some((todo) => todo.id === nextId);
      if (restored.length === 0 && !hasNext) return;
      const restoredById = new Map(restored.map((todo) => [todo.id, todo]));
      await setTodos(
        dataRef.current.todos
          .filter((todo) => todo.id !== nextId)
          .map((todo) => restoredById.get(todo.id) ?? todo),
        () => putAndDeleteTodos(restored, hasNext ? [nextId] : []),
      );
    },
    [setTodos],
  );

  const changePriority = useCallback(
    (id: string, priority: Priority) =>
      replaceOne(id, (todo) =>
        todo.priority === priority
          ? todo
          : { ...todo, priority, updatedAt: new Date().toISOString() },
      ),
    [replaceOne],
  );

  const changeDueDate = useCallback(
    (id: string, dueDate: string | null) =>
      replaceOne(id, (todo) =>
        todo.dueDate === dueDate ? todo : { ...todo, dueDate, updatedAt: new Date().toISOString() },
      ),
    [replaceOne],
  );

  const removeTag = useCallback(
    (id: string, tag: string) =>
      replaceOne(id, (todo) =>
        todo.tags.includes(tag)
          ? {
              ...todo,
              tags: todo.tags.filter((value) => value !== tag),
              updatedAt: new Date().toISOString(),
            }
          : todo,
      ),
    [replaceOne],
  );

  const moveTodo = useCallback(
    (id: string, folderId: string | null) =>
      replaceOne(id, (todo) => moveTodoToFolder(todo, folderId)),
    [replaceOne],
  );

  /** Rewrite and save the given tasks together. Unchanged ones are not saved. */
  const replaceMany = useCallback(
    async (ids: readonly string[], change: (todo: Todo) => Todo) => {
      const targets = new Set(ids);
      const changed: Todo[] = [];
      const next = dataRef.current.todos.map((todo) => {
        if (!targets.has(todo.id)) return todo;
        const updated = change(todo);
        if (updated !== todo) changed.push(updated);
        return updated;
      });
      if (changed.length === 0) return 0;
      await setTodos(next, () => putTodos(changed));
      return changed.length;
    },
    [setTodos],
  );

  const removeTodo = useCallback(
    async (id: string) => {
      await replaceMany([id], (todo) => moveTodoToTrash(todo));
    },
    [replaceMany],
  );

  const restoreTodos = useCallback(
    (ids: readonly string[]) => replaceMany(ids, (todo) => restoreTodoFromTrash(todo)),
    [replaceMany],
  );

  const deleteTodosForever = useCallback(
    async (ids: readonly string[]) => {
      // Target only tasks in the trash so tasks outside it are never deleted by mistake
      const targets = new Set(
        dataRef.current.todos
          .filter((todo) => isTrashed(todo) && ids.includes(todo.id))
          .map((todo) => todo.id),
      );
      if (targets.size === 0) return;
      await setTodos(
        dataRef.current.todos.filter((todo) => !targets.has(todo.id)),
        () => deleteTodos([...targets]),
      );
    },
    [setTodos],
  );

  const emptyTrash = useCallback(
    () => deleteTodosForever(dataRef.current.todos.filter(isTrashed).map((todo) => todo.id)),
    [deleteTodosForever],
  );

  const reorderTodo = useCallback(
    async (id: string, targetId: string, position: DropPosition, visibleIds: readonly string[]) => {
      const current = dataRef.current.todos;
      const next = reorderTodos(current, visibleIds, id, targetId, position);
      const changed = next.filter((todo, index) => todo !== current[index]);
      if (changed.length === 0) return;
      await setTodos(next, () => putTodos(changed));
    },
    [setTodos],
  );

  const removeCompleted = useCallback(
    async (scopeIds?: readonly string[]) => {
      const scope = scopeIds ? new Set(scopeIds) : null;
      const ids = dataRef.current.todos
        .filter(
          (todo) => todo.status === 'done' && !isTrashed(todo) && (!scope || scope.has(todo.id)),
        )
        .map((todo) => todo.id);
      await replaceMany(ids, (todo) => moveTodoToTrash(todo));
      return ids;
    },
    [replaceMany],
  );

  const addFolder = useCallback(
    async (input: FolderInput) => {
      const folder = createFolder(input);
      await commit({ ...dataRef.current, folders: [...dataRef.current.folders, folder] }, () =>
        putAll({ folders: [folder] }),
      );
      return folder;
    },
    [commit],
  );

  const editFolder = useCallback(
    async (id: string, input: FolderInput) => {
      const { folders } = dataRef.current;
      const current = folders.find((folder) => folder.id === id);
      // A folder cannot be moved under itself or its descendants (the UI also prevents choosing them)
      if (!current || wouldCreateCycle(folders, id, input.parentId)) return;
      const updated = updateFolder(current, input);
      await commit(
        {
          ...dataRef.current,
          folders: folders.map((folder) => (folder.id === id ? updated : folder)),
        },
        () => putAll({ folders: [updated] }),
      );
    },
    [commit],
  );

  const moveFolder = useCallback(
    async (id: string, targetId: string | null, position: FolderDropPosition) => {
      const current = dataRef.current.folders;
      const next = moveFolderInTree(current, id, targetId, position);
      const changed = next.filter((folder, index) => folder !== current[index]);
      if (changed.length === 0) return;
      await commit({ ...dataRef.current, folders: next }, () => putAll({ folders: changed }));
    },
    [commit],
  );

  const removeFolder = useCallback(
    async (id: string) => {
      const { todos, folders } = dataRef.current;
      const ids = getSubtreeIds(folders, id);
      const now = new Date().toISOString();
      const moved: Todo[] = [];
      const nextTodos = todos.map((todo) => {
        if (todo.folderId === null || !ids.has(todo.folderId)) return todo;
        const unfiled = { ...todo, folderId: null, updatedAt: now };
        moved.push(unfiled);
        return unfiled;
      });
      await commit(
        { todos: nextTodos, folders: folders.filter((folder) => !ids.has(folder.id)) },
        () => deleteFolders([...ids], moved),
      );
    },
    [commit],
  );

  const importData = useCallback(
    async (incoming: StoredData, mode: ImportMode) => {
      if (mode === 'replace') {
        await commit(incoming, () => replaceAll(incoming));
      } else {
        const merged = mergeData(dataRef.current, incoming);
        await commit(merged, () => putAll(merged));
      }
    },
    [commit],
  );

  const todos = useMemo(() => data.todos.filter((todo) => !isTrashed(todo)), [data.todos]);
  const trash = useMemo(() => data.todos.filter(isTrashed), [data.todos]);

  return {
    todos,
    trash,
    allTodos: data.todos,
    folders: data.folders,
    isLoading,
    error,
    addTodo,
    editTodo,
    changeStatus,
    undoRepeat,
    changePriority,
    changeDueDate,
    removeTag,
    moveTodo,
    reorderTodo,
    removeTodo,
    removeCompleted,
    restoreTodos,
    deleteTodosForever,
    emptyTrash,
    addFolder,
    editFolder,
    moveFolder,
    removeFolder,
    importData,
  };
}
