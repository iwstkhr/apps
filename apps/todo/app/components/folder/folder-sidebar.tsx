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
}

/** ドロップ先。'all' には落とせない */
type DropTarget = 'unfiled' | string;

// 畳んだフォルダの上でこの時間待つと開いて、中のフォルダにも落とせるようにする
const EXPAND_ON_HOVER_MS = 700;

const rowClass =
  'group flex min-w-0 items-center gap-1 rounded-md text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800';
const dropTargetRowClass =
  'bg-blue-100 ring-2 ring-blue-500 ring-inset dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-900';
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
}: FolderSidebarProps) {
  const entries = useMemo(() => flattenFolderTree(folders, collapsed), [folders, collapsed]);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  useEffect(() => {
    if (dropTarget === null || dropTarget === 'unfiled' || !collapsed.has(dropTarget)) return;
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
      onDropTodo(todoId, target === 'unfiled' ? null : target);
    },
  });

  const fixedItem = (value: FolderSelection, label: string, Icon: typeof FaInbox) => (
    <li
      className={cn(
        rowClass,
        selection === value && selectedRowClass,
        dropTarget === value && dropTargetRowClass,
      )}
      {...(value === 'unfiled' ? dropHandlers('unfiled') : {})}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
        onClick={() => onSelect(value)}
        aria-current={selection === value ? 'true' : undefined}
      >
        <Icon className="shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
        <span className="truncate">{label}</span>
        <Count value={openCounts.get(value)} />
      </button>
    </li>
  );

  return (
    <nav aria-label="フォルダ" className="flex flex-col gap-2">
      <ul className="flex flex-col gap-0.5">
        {fixedItem('all', 'すべて', FaLayerGroup)}
        {fixedItem('unfiled', '未分類', FaInbox)}
      </ul>

      <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-800">
        <span className="px-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          フォルダ
        </span>
        <button
          type="button"
          className={actionClass}
          onClick={() => onAdd(null)}
          aria-label="新しいフォルダ"
          title="新しいフォルダ"
        >
          <FaFolderPlus aria-hidden="true" />
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="px-2 text-xs text-slate-500 dark:text-slate-400">
          フォルダはまだありません。
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
                  isSelected && selectedRowClass,
                  dropTarget === folder.id && dropTargetRowClass,
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
                    aria-label={`フォルダ「${folder.name}」を${isCollapsed ? '開く' : '閉じる'}`}
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
                    <FaFolderOpen className="shrink-0 text-amber-500" aria-hidden="true" />
                  ) : (
                    <FaFolder className="shrink-0 text-amber-500" aria-hidden="true" />
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
                    aria-label={`フォルダ「${folder.name}」の中にフォルダを追加`}
                    title="この中にフォルダを追加"
                  >
                    <FaFolderPlus className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={actionClass}
                    onClick={() => onEdit(folder)}
                    aria-label={`フォルダ「${folder.name}」を編集`}
                    title="名前・場所を変更"
                  >
                    <FaPen className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={cn(actionClass, 'hover:text-red-600 dark:hover:text-red-400')}
                    onClick={() => onRemove(folder)}
                    aria-label={`フォルダ「${folder.name}」を削除`}
                    title="削除"
                  >
                    <FaTrash className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
