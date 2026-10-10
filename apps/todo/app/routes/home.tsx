import { type CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { FaFolder, FaPen, FaTimes, FaTrash } from 'react-icons/fa';
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
import { TrashList } from '~/components/todo/trash-list';
import { type ImportMode, useTodos } from '~/hooks/use-todos';
import { SIDEBAR_WIDTH, useViewState } from '~/hooks/use-view-state';
import { cn } from '~/lib/cn';
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
import { type Todo, toLocalDateString } from '~/types/todo';
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
    trash,
    allTodos,
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
    restoreTodos,
    deleteTodosForever,
    emptyTrash,
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
  // undo があれば通知に「元に戻す」を出す (ゴミ箱に移した直後など)
  const [notice, setNotice] = useState<{
    kind: 'info' | 'error';
    text: string;
    undo?: () => void;
  } | null>(null);

  // 選んでいたフォルダが消えたら (別タブで消した場合も) すべてに戻す
  const selection: FolderSelection =
    selectedFolder === 'all' ||
    selectedFolder === 'unfiled' ||
    selectedFolder === 'trash' ||
    folders.some((folder) => folder.id === selectedFolder)
      ? selectedFolder
      : 'all';
  const selectionLabel =
    selection === 'all'
      ? t('すべて')
      : selection === 'unfiled'
        ? t('未分類')
        : selection === 'trash'
          ? t('ゴミ箱')
          : formatFolderPath(folders, selection);
  const isTrash = selection === 'trash';
  const isRealFolder = selection !== 'all' && selection !== 'unfiled' && !isTrash;
  const selectedFolderObject = isRealFolder
    ? folders.find((folder) => folder.id === selection)
    : undefined;
  const selectedFolderColor = selectedFolderObject?.color ?? DEFAULT_FOLDER_COLOR;

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

  // ゴミ箱へは確認なしで移し、通知の「元に戻す」で取り消せるようにする
  const handleRemove = async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    await removeTodo(id);
    setNotice({
      kind: 'info',
      text: t('「{0}」をゴミ箱に移動しました。', [todo.title]),
      undo: () => void handleRestore([todo]),
    });
  };

  const handleRemoveCompleted = async () => {
    // ボタンの件数どおり、今見ているフォルダの完了済みだけを移す
    const ids = await removeCompleted(folderTodos.map((todo) => todo.id));
    if (ids.length === 0) return;
    setNotice({
      kind: 'info',
      text: t('完了済みの {0} 件をゴミ箱に移動しました。', [ids.length]),
      undo: () => void handleRestoreIds(ids),
    });
  };

  const handleRestore = async (restored: Todo[]) => {
    const count = await restoreTodos(restored.map((todo) => todo.id));
    // 完全に削除した後や、もう戻した後に古い通知の「元に戻す」を押したときは何も言わない
    if (count === 0) return setNotice(null);
    setNotice({
      kind: 'info',
      text:
        restored.length === 1
          ? t('「{0}」を元に戻しました。', [restored[0].title])
          : t('{0} 件を元に戻しました。', [count]),
    });
  };

  const handleRestoreIds = async (ids: readonly string[]) => {
    const count = await restoreTodos(ids);
    if (count === 0) return setNotice(null);
    setNotice({ kind: 'info', text: t('{0} 件を元に戻しました。', [count]) });
  };

  // 完全に削除すると戻せないので、こちらは確認する
  const handleDeleteForever = (todo: Todo) => {
    if (
      window.confirm(t('「{0}」を完全に削除しますか？この操作は元に戻せません。', [todo.title]))
    ) {
      void deleteTodosForever([todo.id]);
    }
  };

  const handleEmptyTrash = () => {
    if (
      window.confirm(
        t('ゴミ箱の {0} 件を完全に削除しますか？この操作は元に戻せません。', [trash.length]),
      )
    ) {
      void emptyTrash();
    }
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
        // ゴミ箱のタスクもエクスポートする (deletedAt ごと戻せるように)
        onExport={() => downloadExport({ todos: allTodos, folders })}
        onImportFile={(file) => void handleImportFile(file)}
        exportDisabled={allTodos.length === 0 && folders.length === 0}
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
                // ゴミ箱ではステータスで絞り込まないので、選んだらすべてのタスクに戻る
                if (isTrash) setSelectedFolder('all');
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
              trashCount={trash.length}
              onDropTodoToTrash={(todoId) => void handleRemove(todoId)}
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
                // 一覧の下の方で削除しても「元に戻す」が見えるよう、ヘッダーのすぐ下に貼り付ける
                className={cn(
                  'sticky top-[calc(3.5rem+1px+0.5rem)] z-10 flex items-start gap-2 rounded-md px-3 py-2 text-sm shadow-sm',
                  error || notice?.kind === 'error'
                    ? 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300'
                    : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                )}
              >
                <span className="min-w-0 flex-1 break-words">{error ?? notice?.text}</span>
                {!error && notice?.undo && (
                  <button
                    type="button"
                    className="shrink-0 rounded px-2 py-0.5 font-semibold underline underline-offset-2 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/10"
                    onClick={notice.undo}
                  >
                    {t('元に戻す')}
                  </button>
                )}
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
                {isTrash && (
                  <FaTrash
                    className="shrink-0 text-slate-500 dark:text-slate-400"
                    aria-hidden="true"
                  />
                )}
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

            {isTrash ? (
              <TrashList
                todos={trash}
                folders={folders}
                now={new Date()}
                onRestore={(todo) => void handleRestore([todo])}
                onDeleteForever={handleDeleteForever}
                onEmpty={handleEmptyTrash}
              />
            ) : (
              <>
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
                    onRemove={(id) => void handleRemove(id)}
                    onRemoveTag={(id, tag) => void removeTag(id, tag)}
                    onTagClick={(tag) => setFilters((current) => ({ ...current, tag }))}
                  />
                )}

                {doneCount > 0 && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      onClick={() => void handleRemoveCompleted()}
                    >
                      {t('完了済みをゴミ箱に移動 ({0})', [doneCount])}
                    </button>
                  </div>
                )}
              </>
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
          currentTodoCount={allTodos.length}
          currentFolderCount={folders.length}
          onConfirm={(mode) => void handleImportConfirm(mode)}
          onCancel={cancelImport}
        />
      )}
    </div>
  );
}
