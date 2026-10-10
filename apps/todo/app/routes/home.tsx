import { type CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { FaFolder, FaPen, FaTimes } from 'react-icons/fa';
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
import { APP_DESCRIPTION, applyLanguage, t, useLanguage } from '~/lib/i18n';
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
      // 表示した後は applyLanguage() が選んだ言語の説明文に置き換える
      content: APP_DESCRIPTION,
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
  // 言語を変えたら画面全体を描き直す (各コンポーネントは t() で今の言語の文言を出す)
  const language = useLanguage();
  useEffect(() => applyLanguage(language), [language]);
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
      ? t('すべて')
      : selection === 'unfiled'
        ? t('未分類')
        : formatFolderPath(folders, selection);
  const isRealFolder = selection !== 'all' && selection !== 'unfiled';
  const selectedFolderObject = isRealFolder
    ? folders.find((folder) => folder.id === selection)
    : undefined;
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
    const destination = folderId === null ? t('未分類') : formatFolderPath(folders, folderId);
    setNotice({
      kind: 'info',
      text: t('「{0}」を「{1}」に移動しました。', [todo.title, destination]),
    });
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
    const lines = [t('フォルダ「{0}」を削除しますか？', [folder.name])];
    if (subfolderCount > 0) lines.push(t('中のフォルダ {0} 件も削除されます。', [subfolderCount]));
    if (todoCount > 0) lines.push(t('中の TODO {0} 件は未分類に移ります。', [todoCount]));
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
        text: e instanceof ImportError ? e.message : t('ファイルを読み込めませんでした。'),
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
      text: t('TODO {0} 件とフォルダ {1} 件をインポートしました。', [
        importedTodos.length,
        importedFolders.length,
      ]),
    });
  };

  const cancelImport = useCallback(() => setPendingImport(null), []);
  const cancelFolderDialog = useCallback(() => setFolderDialog(null), []);

  const handleRemove = (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (todo && window.confirm(t('「{0}」を削除しますか？', [todo.title]))) void removeTodo(id);
  };

  const handleRemoveCompleted = () => {
    if (window.confirm(t('完了済みの {0} 件を削除しますか？', [doneCount]))) void removeCompleted();
  };

  const isFiltered =
    filters.keyword.trim() !== '' || filters.status !== 'all' || filters.tag !== null;
  const emptyMessage = isFiltered
    ? t('条件に合う TODO はありません。')
    : todos.length === 0
      ? t('TODO はまだありません。上のフォームから追加してください。')
      : t('ここに TODO はありません。');

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
                    aria-label={t('通知を閉じる')}
                    className="shrink-0 rounded p-1 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/10"
                    onClick={() => setNotice(null)}
                  >
                    <FaTimes aria-hidden="true" />
                  </button>
                )}
              </div>
            )}

            <div className="flex min-w-0 items-center gap-1">
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
              {/* 見ているフォルダをその場で編集できるようにする (フォルダ欄の編集ボタンと同じダイアログ) */}
              {selectedFolderObject && (
                <button
                  type="button"
                  className="shrink-0 cursor-pointer rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  onClick={() => setFolderDialog({ mode: 'edit', folder: selectedFolderObject })}
                  aria-label={t('フォルダ「{0}」を編集', [selectedFolderObject.name])}
                  title={t('名前・色・場所を変更')}
                >
                  <FaPen className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            <section
              aria-label={t('TODO を追加')}
              className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <TodoForm
                submitLabel={t('追加')}
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
                {t('読み込み中…')}
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
                  {t('完了済みを削除 ({0})', [doneCount])}
                </button>
              </div>
            )}
          </main>
          <footer className="text-xs text-slate-500 dark:text-slate-400">
            <p>
              {t(
                'データはこのブラウザの中 (IndexedDB) にだけ保存され、サーバーには送信されません。',
              )}{' '}
              {t(
                'ブラウザのデータを削除すると TODO も消えるため、定期的にエクスポートしてバックアップしてください。',
              )}
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
