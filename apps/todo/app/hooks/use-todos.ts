import { useCallback, useEffect, useRef, useState } from 'react';
import { mergeTodos } from '~/lib/export-import';
import { deleteTodos, getAllTodos, putTodos, replaceAllTodos } from '~/lib/todo-db';
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
  isLoading: boolean;
  error: string | null;
  addTodo: (input: TodoInput) => Promise<void>;
  editTodo: (id: string, input: TodoInput) => Promise<void>;
  changeStatus: (id: string, status: TodoStatus) => Promise<void>;
  removeTodo: (id: string) => Promise<void>;
  removeCompleted: () => Promise<void>;
  importTodos: (incoming: Todo[], mode: ImportMode) => Promise<void>;
}

export function useTodos(): UseTodos {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 非同期の処理から常に最新の一覧を読むため
  const todosRef = useRef<Todo[]>([]);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const apply = useCallback((next: Todo[]) => {
    todosRef.current = next;
    setTodos(next);
  }, []);

  const reload = useCallback(async () => {
    try {
      apply(await getAllTodos());
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
    async (next: Todo[], persist: () => Promise<void>) => {
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

  const addTodo = useCallback(
    async (input: TodoInput) => {
      const todo = createTodo(input);
      await commit([...todosRef.current, todo], () => putTodos([todo]));
    },
    [commit],
  );

  const replaceOne = useCallback(
    async (id: string, change: (todo: Todo) => Todo) => {
      const current = todosRef.current.find((todo) => todo.id === id);
      if (!current) return;
      const updated = change(current);
      if (updated === current) return;
      await commit(
        todosRef.current.map((todo) => (todo.id === id ? updated : todo)),
        () => putTodos([updated]),
      );
    },
    [commit],
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
      await commit(
        todosRef.current.filter((todo) => todo.id !== id),
        () => deleteTodos([id]),
      );
    },
    [commit],
  );

  const removeCompleted = useCallback(async () => {
    const ids = todosRef.current.filter((todo) => todo.status === 'done').map((todo) => todo.id);
    if (ids.length === 0) return;
    await commit(
      todosRef.current.filter((todo) => todo.status !== 'done'),
      () => deleteTodos(ids),
    );
  }, [commit]);

  const importTodos = useCallback(
    async (incoming: Todo[], mode: ImportMode) => {
      if (mode === 'replace') {
        await commit(incoming, () => replaceAllTodos(incoming));
      } else {
        const merged = mergeTodos(todosRef.current, incoming);
        await commit(merged, () => putTodos(merged));
      }
    },
    [commit],
  );

  return {
    todos,
    isLoading,
    error,
    addTodo,
    editTodo,
    changeStatus,
    removeTodo,
    removeCompleted,
    importTodos,
  };
}
