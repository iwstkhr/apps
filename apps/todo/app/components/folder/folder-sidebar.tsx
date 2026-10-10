import { type DragEvent, useEffect, useMemo, useState } from 'react';
import {
  FaChevronDown,
  FaChevronRight,
  FaFolder,
  FaFolderOpen,
  FaFolderPlus,
  FaInbox,
  FaLayerGroup,
  FaPen,
  FaTrash,
} from 'react-icons/fa';
import { cn } from '~/lib/cn';
import { type FolderSelection, flattenFolderTree } from '~/lib/folder-tree';
import { t } from '~/lib/i18n';
import { getDraggedTodo, isDraggingTodo } from '~/lib/todo-drag';
import type { Folder } from '~/types/folder';

interface FolderSidebarProps {
  folders: Folder[];
  /** 未完了の TODO の件数 (子孫を含む) */
  openCounts: Map<FolderSelection, number>;
  selection: FolderSelection;
  onSelect: (selection: FolderSelection) => void;
  collapsed: ReadonlySet<string>;
  onToggleCollapsed: (id: string) => void;
  onAdd: (parentId: string | null) => void;
  onEdit: (folder: Folder) => void;
  onRemove: (folder: Folder) => void;
  /** タスクをフォルダ (null は未分類) にドロップした */
  onDropTodo: (todoId: string, folderId: string | null) => void;
  /** ゴミ箱の件数 */
  trashCount: number;
  /** タスクをゴミ箱にドロップした */
  onDropTodoToTrash: (todoId: string) => void;
}

/** ドロップ先。'all' には落とせない */
type DropTarget = 'unfiled' | 'trash' | string;

// 畳んだフォルダの上でこの時間待つと開いて、中のフォルダにも落とせるようにする
const EXPAND_ON_HOVER_MS = 700;

const rowClass =
  'group flex min-w-0 items-center gap-1 rounded-md text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800';
// ドロップ先は選択中の行 (薄い青) と見分けられるよう、明るさの差が大きい塗りつぶしにする。
// ダークモードでも同じ色にし、名前と件数も白にする
const dropTargetRowClass =
  'bg-blue-600 text-white ring-2 ring-blue-300 hover:bg-blue-600 dark:bg-blue-500 dark:ring-blue-200 dark:hover:bg-blue-500 [&_span]:text-white';
const selectedRowClass =
  'bg-blue-50 text-blue-800 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900';
const actionClass =
  'rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100';

function Count({ value }: { value: number | undefined }) {
  if (!value) return null;
  return (
    <span className="ml-auto shrink-0 pl-1 text-xs tabular-nums text-slate-500 dark:text-slate-400">
      {value}
    </span>
  );
}

export function FolderSidebar({
  folders,
  openCounts,
  selection,
  onSelect,
  collapsed,
  onToggleCollapsed,
  onAdd,
  onEdit,
  onRemove,
  onDropTodo,
  trashCount,
  onDropTodoToTrash,
}: FolderSidebarProps) {
  const entries = useMemo(() => flattenFolderTree(folders, collapsed), [folders, collapsed]);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  useEffect(() => {
    if (dropTarget === null || !collapsed.has(dropTarget)) return;
    const timer = setTimeout(() => onToggleCollapsed(dropTarget), EXPAND_ON_HOVER_MS);
    return () => clearTimeout(timer);
  }, [dropTarget, collapsed, onToggleCollapsed]);

  /** タスクのドロップを受け付ける行に付けるハンドラ。 */
  const dropHandlers = (target: DropTarget) => ({
    onDragOver: (event: DragEvent) => {
      if (!isDraggingTodo(event.dataTransfer)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      if (dropTarget !== target) setDropTarget(target);
    },
    onDragLeave: (event: DragEvent) => {
      // 行の中の要素へ移っただけなら外れていない
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
      setDropTarget((current) => (current === target ? null : current));
    },
    onDrop: (event: DragEvent) => {
      const todoId = getDraggedTodo(event.dataTransfer);
      setDropTarget(null);
      if (!todoId) return;
      event.preventDefault();
      if (target === 'trash') onDropTodoToTrash(todoId);
      else onDropTodo(todoId, target === 'unfiled' ? null : target);
    },
  });

  const fixedItem = (
    value: FolderSelection,
    label: string,
    Icon: typeof FaInbox,
    count = openCounts.get(value),
  ) => (
    <li
      className={cn(
        rowClass,
        // ドロップ先の色を優先する (両方付けると CSS の並び順次第でどちらかが勝つ)
        dropTarget === value ? dropTargetRowClass : selection === value && selectedRowClass,
      )}
      {...(value === 'unfiled' || value === 'trash' ? dropHandlers(value) : {})}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
        onClick={() => onSelect(value)}
        aria-current={selection === value ? 'true' : undefined}
      >
        <Icon className="shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
        <span className="truncate">{t(label)}</span>
        <Count value={count} />
      </button>
    </li>
  );

  return (
    <nav aria-label={t('フォルダ')} className="flex flex-col gap-2">
      <ul className="flex flex-col gap-0.5">
        {fixedItem('all', 'すべて', FaLayerGroup)}
        {fixedItem('unfiled', '未分類', FaInbox)}
      </ul>

      <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-800">
        <span className="px-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {t('フォルダ')}
        </span>
        <button
          type="button"
          className={actionClass}
          onClick={() => onAdd(null)}
          aria-label={t('新しいフォルダ')}
          title={t('新しいフォルダ')}
        >
          <FaFolderPlus aria-hidden="true" />
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="px-2 text-xs text-slate-500 dark:text-slate-400">
          {t('フォルダはまだありません。')}
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {entries.map(({ folder, depth, hasChildren }) => {
            const isSelected = selection === folder.id;
            const isCollapsed = collapsed.has(folder.id);
            return (
              <li
                key={folder.id}
                className={cn(
                  rowClass,
                  dropTarget === folder.id ? dropTargetRowClass : isSelected && selectedRowClass,
                )}
                style={{ paddingLeft: `${depth * 0.875}rem` }}
                {...dropHandlers(folder.id)}
              >
                {hasChildren ? (
                  <button
                    type="button"
                    className="shrink-0 rounded p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                    onClick={() => onToggleCollapsed(folder.id)}
                    aria-expanded={!isCollapsed}
                    aria-label={t(
                      isCollapsed ? 'フォルダ「{0}」を開く' : 'フォルダ「{0}」を閉じる',
                      [folder.name],
                    )}
                  >
                    {isCollapsed ? (
                      <FaChevronRight className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <FaChevronDown className="h-3 w-3" aria-hidden="true" />
                    )}
                  </button>
                ) : (
                  <span className="w-5 shrink-0" />
                )}
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-1 text-left"
                  onClick={() => onSelect(folder.id)}
                  aria-current={isSelected ? 'true' : undefined}
                >
                  {isSelected ? (
                    <FaFolderOpen
                      className="shrink-0"
                      style={{ color: folder.color }}
                      aria-hidden="true"
                    />
                  ) : (
                    <FaFolder
                      className="shrink-0"
                      style={{ color: folder.color }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="truncate">{folder.name}</span>
                  <Count value={openCounts.get(folder.id)} />
                </button>
                {/* 操作ボタンは画面が広いときはホバー・フォーカス中だけ出す */}
                <div className="flex shrink-0 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
                  <button
                    type="button"
                    className={actionClass}
                    onClick={() => onAdd(folder.id)}
                    aria-label={t('フォルダ「{0}」の中にフォルダを追加', [folder.name])}
                    title={t('この中にフォルダを追加')}
                  >
                    <FaFolderPlus className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={actionClass}
                    onClick={() => onEdit(folder)}
                    aria-label={t('フォルダ「{0}」を編集', [folder.name])}
                    title={t('名前・色・場所を変更')}
                  >
                    <FaPen className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={cn(actionClass, 'hover:text-red-600 dark:hover:text-red-400')}
                    onClick={() => onRemove(folder)}
                    aria-label={t('フォルダ「{0}」を削除', [folder.name])}
                    title={t('削除')}
                  >
                    <FaTrash className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ゴミ箱はフォルダの一覧の下に分けて置く。タスクをドロップしてもゴミ箱に移せる */}
      <ul className="flex flex-col gap-0.5 border-t border-slate-200 pt-2 dark:border-slate-800">
        {fixedItem('trash', 'ゴミ箱', FaTrash, trashCount)}
      </ul>
    </nav>
  );
}
