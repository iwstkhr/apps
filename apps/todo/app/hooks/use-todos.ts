import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { mergeData } from '~/lib/export-import';
import { getSubtreeIds, wouldCreateCycle } from '~/lib/folder-tree';
import { t } from '~/lib/i18n';
import {
  deleteFolders,
  deleteTodos,
  getAll,
  putAll,
  putTodos,
  replaceAll,
  type StoredData,
} from '~/lib/todo-db';
import { compareCustomOrder, type DropPosition, reorderTodos } from '~/lib/todo-order';
import { createFolder, type Folder, type FolderInput, updateFolder } from '~/types/folder';
import {
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

// 同じブラウザの別タブで変更されたら読み直す
const CHANNEL_NAME = 'todo-changes';

export type ImportMode = 'replace' | 'merge';

export interface UseTodos {
  /** ゴミ箱に入っていないタスク */
  todos: Todo[];
  /** ゴミ箱のタスク */
  trash: Todo[];
  /** ゴミ箱を含むすべてのタスク (エクスポート用) */
  allTodos: Todo[];
  folders: Folder[];
  isLoading: boolean;
  error: string | null;
  addTodo: (input: TodoInput) => Promise<void>;
  editTodo: (id: string, input: TodoInput) => Promise<void>;
  changeStatus: (id: string, status: TodoStatus) => Promise<void>;
  changePriority: (id: string, priority: Priority) => Promise<void>;
  removeTag: (id: string, tag: string) => Promise<void>;
  /** folderId が null なら未分類に移す */
  moveTodo: (id: string, folderId: string | null) => Promise<void>;
  reorderTodo: (
    id: string,
    targetId: string,
    position: DropPosition,
    visibleIds: readonly string[],
  ) => Promise<void>;
  /** ゴミ箱に移す */
  removeTodo: (id: string) => Promise<void>;
  /** 完了済みをゴミ箱に移し、移した id を返す (元に戻すため) */
  removeCompleted: () => Promise<string[]>;
  restoreTodos: (ids: readonly string[]) => Promise<void>;
  /** ゴミ箱から完全に削除する */
  deleteTodosForever: (ids: readonly string[]) => Promise<void>;
  emptyTrash: () => Promise<void>;
  /** 作ったフォルダを返す */
  addFolder: (input: FolderInput) => Promise<Folder>;
  editFolder: (id: string, input: FolderInput) => Promise<void>;
  /** フォルダと子孫を消し、中の TODO は未分類に移す */
  removeFolder: (id: string) => Promise<void>;
  importData: (incoming: StoredData, mode: ImportMode) => Promise<void>;
}

const EMPTY: StoredData = { todos: [], folders: [] };

export function useTodos(): UseTodos {
  const [data, setData] = useState<StoredData>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 非同期の処理から常に最新のデータを読むため
  const dataRef = useRef<StoredData>(EMPTY);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const apply = useCallback((next: StoredData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  const reload = useCallback(async () => {
    try {
      const loaded = await getAll();
      // ゴミ箱に入れてから期限を過ぎたものは、開いたときに完全に削除する
      const expired = loaded.todos.filter((todo) => shouldPurge(todo)).map((todo) => todo.id);
      if (expired.length > 0) {
        await deleteTodos(expired);
        const ids = new Set(expired);
        loaded.todos = loaded.todos.filter((todo) => !ids.has(todo.id));
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
    // ブラウザがストレージを勝手に消さないよう永続化を頼む (断られても動作は変わらない)
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

  /** 画面を先に更新してから保存する。保存に失敗したら DB の内容に戻す。 */
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
      const todo = createTodo(input);
      const current = dataRef.current.todos;
      let normalized = current;
      if (current.some((item) => item.customOrder !== null)) {
        const ranks = new Map(
          [...current].sort(compareCustomOrder).map((item, index) => [item.id, index]),
        );
        normalized = current.map((item) =>
          item.customOrder === ranks.get(item.id)
            ? item
            : { ...item, customOrder: ranks.get(item.id) ?? 0, updatedAt: todo.createdAt },
        );
        todo.customOrder = current.length;
      }
      const changed = normalized.filter((item, index) => item !== current[index]);
      await setTodos([...normalized, todo], () => putTodos([...changed, todo]));
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
    (id: string, status: TodoStatus) => replaceOne(id, (todo) => setTodoStatus(todo, status)),
    [replaceOne],
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

  /** 指定したタスクをまとめて書き換えて保存する。変わらなかったものは保存しない。 */
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
      if (changed.length === 0) return;
      await setTodos(next, () => putTodos(changed));
    },
    [setTodos],
  );

  const removeTodo = useCallback(
    (id: string) => replaceMany([id], (todo) => moveTodoToTrash(todo)),
    [replaceMany],
  );

  const restoreTodos = useCallback(
    (ids: readonly string[]) => replaceMany(ids, (todo) => restoreTodoFromTrash(todo)),
    [replaceMany],
  );

  const deleteTodosForever = useCallback(
    async (ids: readonly string[]) => {
      // 誤ってゴミ箱の外のタスクを消さないよう、ゴミ箱にあるものだけを対象にする
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

  const removeCompleted = useCallback(async () => {
    const ids = dataRef.current.todos
      .filter((todo) => todo.status === 'done' && !isTrashed(todo))
      .map((todo) => todo.id);
    await replaceMany(ids, (todo) => moveTodoToTrash(todo));
    return ids;
  }, [replaceMany]);

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
      // 自分や子孫の下には動かせない (画面でも選べないようにしている)
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
    changePriority,
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
    removeFolder,
    importData,
  };
}
