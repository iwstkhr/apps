import { useCallback, useMemo, useState } from 'react';
import { ImportDialog } from '~/components/data/import-dialog';
import { AppHeader } from '~/components/layout/app-header';
import { TodoForm } from '~/components/todo/todo-form';
import { TodoList } from '~/components/todo/todo-list';
import { TodoToolbar } from '~/components/todo/todo-toolbar';
import { type ImportMode, useTodos } from '~/hooks/use-todos';
import { downloadExport, ImportError, type ParsedImport, parseImport } from '~/lib/export-import';
import { secondaryButtonClass } from '~/lib/styles';
import {
  applyFilters,
  collectTags,
  countByStatus,
  DEFAULT_FILTERS,
  type TodoFilters,
} from '~/lib/todo-filters';
import { toLocalDateString } from '~/types/todo';
import type { Route } from './+types/home';

export function meta(_args: Route.MetaArgs) {
  return [
    { title: 'TODO' },
    {
      name: 'description',
      content: 'ブラウザだけで使える TODO 管理アプリ。データは端末の中にだけ保存されます。',
    },
  ];
}

interface PendingImport extends ParsedImport {
  fileName: string;
}

export default function Home() {
  const {
    todos,
    isLoading,
    error,
    addTodo,
    editTodo,
    changeStatus,
    removeTodo,
    removeCompleted,
    importTodos,
  } = useTodos();
  const [filters, setFilters] = useState<TodoFilters>(DEFAULT_FILTERS);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [notice, setNotice] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);

  const today = toLocalDateString(new Date());
  const tags = useMemo(() => collectTags(todos), [todos]);
  const visibleTodos = useMemo(() => applyFilters(todos, filters), [todos, filters]);
  const counts = useMemo(() => countByStatus(todos), [todos]);
  const doneCount = counts.done;

  const handleImportFile = async (file: File) => {
    try {
      const parsed = parseImport(await file.text());
      setPendingImport({ ...parsed, fileName: file.name });
      setNotice(null);
    } catch (e) {
      setNotice({
        kind: 'error',
        text: e instanceof ImportError ? e.message : 'ファイルを読み込めませんでした。',
      });
    }
  };

  const handleImportConfirm = async (mode: ImportMode) => {
    if (!pendingImport) return;
    await importTodos(pendingImport.todos, mode);
    setNotice({
      kind: 'info',
      text: `${pendingImport.todos.length} 件の TODO をインポートしました。`,
    });
    setPendingImport(null);
  };

  const cancelImport = useCallback(() => setPendingImport(null), []);

  const handleRemove = (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (todo && window.confirm(`「${todo.title}」を削除しますか？`)) void removeTodo(id);
  };

  const handleRemoveCompleted = () => {
    if (window.confirm(`完了済みの ${doneCount} 件を削除しますか？`)) void removeCompleted();
  };

  const isFiltered =
    filters.keyword.trim() !== '' || filters.status !== 'all' || filters.tag !== null;

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader
        onExport={() => downloadExport(todos)}
        onImportFile={(file) => void handleImportFile(file)}
        exportDisabled={todos.length === 0}
      />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-3 py-4 sm:px-4">
        {(error || notice) && (
          <div
            role={error || notice?.kind === 'error' ? 'alert' : 'status'}
            className={
              error || notice?.kind === 'error'
                ? 'rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-300'
                : 'rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
            }
          >
            {error ?? notice?.text}
          </div>
        )}

        <section
          aria-label="TODO を追加"
          className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
        >
          <TodoForm submitLabel="追加" collapsible tagSuggestions={tags} onSubmit={addTodo} />
        </section>

        <TodoToolbar filters={filters} onChange={setFilters} tags={tags} counts={counts} />

        {isLoading ? (
          <p className="p-8 text-center text-sm text-slate-500" role="status">
            読み込み中…
          </p>
        ) : (
          <TodoList
            todos={visibleTodos}
            today={today}
            tagSuggestions={tags}
            emptyMessage={
              isFiltered
                ? '条件に合う TODO はありません。'
                : 'TODO はまだありません。上のフォームから追加してください。'
            }
            onStatusChange={(id, status) => void changeStatus(id, status)}
            onEdit={editTodo}
            onRemove={handleRemove}
            onTagClick={(tag) => setFilters((current) => ({ ...current, tag }))}
          />
        )}

        {doneCount > 0 && (
          <div className="flex justify-end">
            <button type="button" className={secondaryButtonClass} onClick={handleRemoveCompleted}>
              完了済みを削除 ({doneCount})
            </button>
          </div>
        )}
      </main>

      <footer className="mx-auto w-full max-w-3xl px-3 pb-6 text-xs text-slate-500 sm:px-4 dark:text-slate-400">
        データはこのブラウザの中 (IndexedDB) にだけ保存され、サーバーには送信されません。
        ブラウザのデータを削除すると TODO
        も消えるため、定期的にエクスポートしてバックアップしてください。
      </footer>

      {pendingImport && (
        <ImportDialog
          fileName={pendingImport.fileName}
          importCount={pendingImport.todos.length}
          skipped={pendingImport.skipped}
          currentCount={todos.length}
          onConfirm={(mode) => void handleImportConfirm(mode)}
          onCancel={cancelImport}
        />
      )}
    </div>
  );
}
