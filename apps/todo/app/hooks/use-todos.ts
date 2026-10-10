import { useCallback, useEffect, useRef, useState } from 'react';
import { mergeData } from '~/lib/export-import';
import { getSubtreeIds, wouldCreateCycle } from '~/lib/folder-tree';
import {
  deleteFolders,
  deleteTodos,
  getAll,
  putAll,
  putTodos,
  replaceAll,
  type StoredData,
} from '~/lib/todo-db';
import { createFolder, type Folder, type FolderInput, updateFolder } from '~/types/folder';
import {
  createTodo,
  setTodoStatus,
  type Todo,
  type TodoInput,
  type TodoStatus,
  updateTodo,
} from '~/types/todo';

// 同じブラウザの別タブで変更されたら読み直す
const CHANNEL_NAME = 'todo-changes';

export type ImportMode = 'replace' | 'merge';

export interface UseTodos {
  todos: Todo[];
  folders: Folder[];
  isLoading: boolean;
  error: string | null;
  addTodo: (input: TodoInput) => Promise<void>;
  editTodo: (id: string, input: TodoInput) => Promise<void>;
  changeStatus: (id: string, status: TodoStatus) => Promise<void>;
  removeTodo: (id: string) => Promise<void>;
  removeCompleted: () => Promise<void>;
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
      apply(await getAll());
      setError(null);
    } catch {
      setError(
        'データを読み込めませんでした。ブラウザの設定で保存が許可されているか確認してください。',
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
        setError('保存できませんでした。もう一度お試しください。');
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
      await setTodos([...dataRef.current.todos, todo], () => putTodos([todo]));
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

  const removeTodo = useCallback(
    async (id: string) => {
      await setTodos(
        dataRef.current.todos.filter((todo) => todo.id !== id),
        () => deleteTodos([id]),
      );
    },
    [setTodos],
  );

  const removeCompleted = useCallback(async () => {
    const { todos } = dataRef.current;
    const ids = todos.filter((todo) => todo.status === 'done').map((todo) => todo.id);
    if (ids.length === 0) return;
    await setTodos(
      todos.filter((todo) => todo.status !== 'done'),
      () => deleteTodos(ids),
    );
  }, [setTodos]);

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

  return {
    todos: data.todos,
    folders: data.folders,
    isLoading,
    error,
    addTodo,
    editTodo,
    changeStatus,
    removeTodo,
    removeCompleted,
    addFolder,
    editFolder,
    removeFolder,
    importData,
  };
}
