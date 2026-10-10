import { type CSSProperties, useCallback, useMemo, useState } from 'react';
import { FaFolder, FaTimes } from 'react-icons/fa';
import { ImportDialog } from '~/components/data/import-dialog';
import { FolderDialog } from '~/components/folder/folder-dialog';
import { FolderSidebar } from '~/components/folder/folder-sidebar';
import { AppHeader } from '~/components/layout/app-header';
import { SidebarPanel } from '~/components/layout/sidebar-panel';
import { SidebarResizer } from '~/components/layout/sidebar-resizer';
import { StatusSidebar } from '~/components/todo/status-sidebar';
import { TodoForm } from '~/components/todo/todo-form';
import { TodoList } from '~/components/todo/todo-list';
import { TodoToolbar } from '~/components/todo/todo-toolbar';
import { type ImportMode, useTodos } from '~/hooks/use-todos';
import { SIDEBAR_WIDTH, useViewState } from '~/hooks/use-view-state';
import { downloadExport, ImportError, type ParsedImport, parseImport } from '~/lib/export-import';
import {
  countOpenByFolder,
  type FolderSelection,
  filterByFolder,
  formatFolderPath,
  getSubtreeIds,
} from '~/lib/folder-tree';
import { secondaryButtonClass } from '~/lib/styles';
import {
  applyFilters,
  collectTags,
  countByStatus,
  DEFAULT_FILTERS,
  type TodoFilters,
} from '~/lib/todo-filters';
import { DEFAULT_FOLDER_COLOR, type Folder, type FolderInput } from '~/types/folder';
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

type FolderDialogState =
  | { mode: 'create'; parentId: string | null }
  | { mode: 'edit'; folder: Folder };

export default function Home() {
  const {
    todos,
    folders,
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
    addFolder,
    editFolder,
    removeFolder,
    importData,
  } = useTodos();
  const [filters, setFilters] = useState<TodoFilters>(DEFAULT_FILTERS);
  const {
    selectedFolder,
    setSelectedFolder,
    collapsedFolders,
    setCollapsedFolders,
    sidebarWidth,
    setSidebarWidth,
    sort,
    setSort,
  } = useViewState();
  const [showFolders, setShowFolders] = useState(false);
  const closeMenu = useCallback(() => setShowFolders(false), []);
  const [folderDialog, setFolderDialog] = useState<FolderDialogState | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [notice, setNotice] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);

  // 選んでいたフォルダが消えたら (別タブで消した場合も) すべてに戻す
  const selection: FolderSelection =
    selectedFolder === 'all' ||
    selectedFolder === 'unfiled' ||
    folders.some((folder) => folder.id === selectedFolder)
      ? selectedFolder
      : 'all';
  const selectionLabel =
    selection === 'all'
      ? 'すべて'
      : selection === 'unfiled'
        ? '未分類'
        : formatFolderPath(folders, selection);
  const isRealFolder = selection !== 'all' && selection !== 'unfiled';
  const selectedFolderColor =
    folders.find((folder) => folder.id === selection)?.color ?? DEFAULT_FOLDER_COLOR;

  const today = toLocalDateString(new Date());
  const tags = useMemo(() => collectTags(todos), [todos]);
  const openCounts = useMemo(() => countOpenByFolder(todos, folders), [todos, folders]);
  const folderTodos = useMemo(
    () => filterByFolder(todos, folders, selection),
    [todos, folders, selection],
  );
  const visibleTodos = useMemo(
    () => applyFilters(folderTodos, { ...filters, sort }),
    [folderTodos, filters, sort],
  );
  const counts = useMemo(() => countByStatus(folderTodos), [folderTodos]);
  const doneCount = counts.done;

  const selectFolder = (next: FolderSelection) => {
    setSelectedFolder(next);
    setShowFolders(false);
  };

  const toggleCollapsed = useCallback(
    (id: string) =>
      setCollapsedFolders((current) => {
        const next = new Set(current);
        if (!next.delete(id)) next.add(id);
        return next;
      }),
    [setCollapsedFolders],
  );

  const handleDropTodo = async (todoId: string, folderId: string | null) => {
    const todo = todos.find((t) => t.id === todoId);
    if (!todo || todo.folderId === folderId) return;
    await moveTodo(todoId, folderId);
    const destination = folderId === null ? '未分類' : formatFolderPath(folders, folderId);
    setNotice({ kind: 'info', text: `「${todo.title}」を「${destination}」に移動しました。` });
  };

  const handleFolderSubmit = async (input: FolderInput) => {
    if (!folderDialog) return;
    setFolderDialog(null);
    if (folderDialog.mode === 'edit') {
      await editFolder(folderDialog.folder.id, input);
      return;
    }
    const folder = await addFolder(input);
    // 作ったフォルダが見えるよう親を開いてから選ぶ
    if (input.parentId !== null) {
      setCollapsedFolders((current) => {
        const next = new Set(current);
        next.delete(input.parentId as string);
        return next;
      });
    }
    selectFolder(folder.id);
  };

  const handleRemoveFolder = (folder: Folder) => {
    const ids = getSubtreeIds(folders, folder.id);
    const subfolderCount = ids.size - 1;
    const todoCount = todos.filter((t) => t.folderId !== null && ids.has(t.folderId)).length;
    const lines = [`フォルダ「${folder.name}」を削除しますか？`];
    if (subfolderCount > 0) lines.push(`中のフォルダ ${subfolderCount} 件も削除されます。`);
    if (todoCount > 0) lines.push(`中の TODO ${todoCount} 件は未分類に移ります。`);
    if (window.confirm(lines.join('\n'))) void removeFolder(folder.id);
  };

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
    const { todos: importedTodos, folders: importedFolders } = pendingImport;
    setPendingImport(null);
    await importData({ todos: importedTodos, folders: importedFolders }, mode);
    setNotice({
      kind: 'info',
      text: `TODO ${importedTodos.length} 件とフォルダ ${importedFolders.length} 件をインポートしました。`,
    });
  };

  const cancelImport = useCallback(() => setPendingImport(null), []);
  const cancelFolderDialog = useCallback(() => setFolderDialog(null), []);

  const handleRemove = (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (todo && window.confirm(`「${todo.title}」を削除しますか？`)) void removeTodo(id);
  };

  const handleRemoveCompleted = () => {
    if (window.confirm(`完了済みの ${doneCount} 件を削除しますか？`)) void removeCompleted();
  };

  const isFiltered =
    filters.keyword.trim() !== '' || filters.status !== 'all' || filters.tag !== null;
  const emptyMessage = isFiltered
    ? '条件に合う TODO はありません。'
    : todos.length === 0
      ? 'TODO はまだありません。上のフォームから追加してください。'
      : 'ここに TODO はありません。';

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader
        menuOpen={showFolders}
        onOpenMenu={() => setShowFolders(true)}
        onExport={() => downloadExport({ todos, folders })}
        onImportFile={(file) => void handleImportFile(file)}
        exportDisabled={todos.length === 0 && folders.length === 0}
      />

      <div
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 py-4 sm:px-4 lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)] lg:items-start lg:gap-6"
        style={{ '--sidebar-width': `${sidebarWidth}px` } as CSSProperties}
      >
        {/* 広い画面ではヘッダーの下から画面の下端までの高さにし、一覧をスクロールしても動かさない
            (ヘッダー 3.5rem + 境界線 1px + 上下の余白 1rem ずつ) */}
        <aside
          id="folder-sidebar"
          className="relative lg:sticky lg:top-[calc(3.5rem+1px+1rem)] lg:mb-0 lg:flex lg:h-[calc(100svh-3.5rem-1px-2rem)] lg:flex-col"
        >
          <SidebarPanel open={showFolders} onClose={closeMenu}>
            <StatusSidebar
              value={filters.status}
              counts={counts}
              onChange={(status) => {
                setFilters((current) => ({ ...current, status }));
                setShowFolders(false);
              }}
            />
            <FolderSidebar
              folders={folders}
              openCounts={openCounts}
              selection={selection}
              onSelect={selectFolder}
              collapsed={collapsedFolders}
              onToggleCollapsed={toggleCollapsed}
              onAdd={(parentId) => {
                closeMenu();
                setFolderDialog({ mode: 'create', parentId });
              }}
              onEdit={(folder) => {
                closeMenu();
                setFolderDialog({ mode: 'edit', folder });
              }}
              onRemove={handleRemoveFolder}
              onDropTodo={(todoId, folderId) => void handleDropTodo(todoId, folderId)}
            />
          </SidebarPanel>
          <SidebarResizer
            width={sidebarWidth}
            min={SIDEBAR_WIDTH.min}
            max={SIDEBAR_WIDTH.max}
            defaultWidth={SIDEBAR_WIDTH.default}
            onChange={setSidebarWidth}
            controls="folder-sidebar"
          />
        </aside>

        {/* フッターも右の列に入れ、フォルダ欄がページの下端まで画面に固定されるようにする */}
        <div id="todo-main-column" className="flex min-w-0 flex-1 flex-col gap-8 lg:self-stretch">
          <main className="flex min-w-0 flex-1 flex-col gap-4">
            {(error || notice) && (
              <div
                role={error || notice?.kind === 'error' ? 'alert' : 'status'}
                className={
                  error || notice?.kind === 'error'
                    ? 'flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-300'
                    : 'flex items-start gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }
              >
                <span className="min-w-0 flex-1 break-words">{error ?? notice?.text}</span>
                {!error && notice && (
                  <button
                    type="button"
                    aria-label="通知を閉じる"
                    className="shrink-0 rounded p-1 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/10"
                    onClick={() => setNotice(null)}
                  >
                    <FaTimes aria-hidden="true" />
                  </button>
                )}
              </div>
            )}

            <h2 className="flex min-w-0 items-center gap-2 text-lg font-bold">
              {isRealFolder && (
                <FaFolder
                  className="shrink-0"
                  style={{ color: selectedFolderColor }}
                  aria-hidden="true"
                />
              )}
              <span className="truncate">{selectionLabel}</span>
            </h2>

            <section
              aria-label="TODO を追加"
              className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <TodoForm
                submitLabel="追加"
                collapsible
                tagSuggestions={tags}
                folders={folders}
                defaultFolderId={isRealFolder ? selection : null}
                onSubmit={addTodo}
              />
            </section>

            <TodoToolbar
              filters={{ ...filters, sort }}
              onChange={(next) => {
                setFilters(next);
                setSort(next.sort);
              }}
              tags={tags}
            />

            {isLoading ? (
              <p className="p-8 text-center text-sm text-slate-500" role="status">
                読み込み中…
              </p>
            ) : (
              <TodoList
                todos={visibleTodos}
                folders={folders}
                folderSelection={selection}
                today={today}
                tagSuggestions={tags}
                emptyMessage={emptyMessage}
                onReorder={
                  sort === 'custom'
                    ? (id, targetId, position) =>
                        void reorderTodo(
                          id,
                          targetId,
                          position,
                          visibleTodos.map((todo) => todo.id),
                        )
                    : undefined
                }
                onPriorityChange={(id, priority) => void changePriority(id, priority)}
                onStatusChange={(id, status) => void changeStatus(id, status)}
                onEdit={editTodo}
                onRemove={handleRemove}
                onRemoveTag={(id, tag) => void removeTag(id, tag)}
                onTagClick={(tag) => setFilters((current) => ({ ...current, tag }))}
              />
            )}

            {doneCount > 0 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={handleRemoveCompleted}
                >
                  完了済みを削除 ({doneCount})
                </button>
              </div>
            )}
          </main>
          <footer className="text-xs text-slate-500 dark:text-slate-400">
            <p>
              データはこのブラウザの中 (IndexedDB) にだけ保存され、サーバーには送信されません。
              ブラウザのデータを削除すると TODO
              も消えるため、定期的にエクスポートしてバックアップしてください。
            </p>
            <p className="mt-4 border-t border-slate-200 pt-4 text-center dark:border-slate-800">
              © {new Date().getFullYear()} wasabee.dev. All Rights Reserved.
            </p>
          </footer>
        </div>
      </div>

      {folderDialog && (
        <FolderDialog
          folders={folders}
          folder={folderDialog.mode === 'edit' ? folderDialog.folder : undefined}
          defaultParentId={folderDialog.mode === 'create' ? folderDialog.parentId : null}
          onSubmit={(input) => void handleFolderSubmit(input)}
          onCancel={cancelFolderDialog}
        />
      )}

      {pendingImport && (
        <ImportDialog
          fileName={pendingImport.fileName}
          todoCount={pendingImport.todos.length}
          folderCount={pendingImport.folders.length}
          skipped={pendingImport.skipped}
          currentTodoCount={todos.length}
          currentFolderCount={folders.length}
          onConfirm={(mode) => void handleImportConfirm(mode)}
          onCancel={cancelImport}
        />
      )}
    </div>
  );
}
