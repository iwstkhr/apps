import { useState } from 'react';
import {
  FaArrowDown,
  FaArrowUp,
  FaCalendarAlt,
  FaFlag,
  FaFolder,
  FaGripVertical,
  FaPen,
  FaRedo,
  FaTimes,
  FaTrash,
} from 'react-icons/fa';
import { MarkdownMemo } from '~/components/todo/markdown-memo';
import { TodoForm } from '~/components/todo/todo-form';
import { cn } from '~/lib/cn';
import { t } from '~/lib/i18n';
import { setDraggedTodo } from '~/lib/todo-drag';
import type { DropPosition } from '~/lib/todo-order';
import type { Folder } from '~/types/folder';
import {
  getDueStatus,
  PRIORITIES,
  PRIORITY_LABELS,
  type Priority,
  REPEAT_LABELS,
  STATUS_LABELS,
  STATUSES,
  type Todo,
  type TodoInput,
  type TodoStatus,
} from '~/types/todo';

const PRIORITY_CLASSES: Record<Priority, string> = {
  high: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  low: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const STATUS_CLASSES: Record<TodoStatus, string> = {
  todo: 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
  in_progress:
    'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
  on_hold:
    'border-purple-300 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300',
  done: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
};

// Use the pointer cursor so the action buttons look clickable
const iconButtonClass =
  'cursor-pointer rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100';

interface TodoItemProps {
  todo: Todo;
  today: string;
  tagSuggestions: string[];
  folders: Folder[];
  /** The folder path to show. null when it is the folder being viewed */
  folderPath: string | null;
  onStatusChange: (id: string, status: TodoStatus) => void;
  onPriorityChange: (id: string, priority: Priority) => void;
  /** A null dueDate removes the due date */
  onDueDateChange: (id: string, dueDate: string | null) => void;
  onEdit: (id: string, input: TodoInput) => Promise<void>;
  onRemove: (id: string) => void;
  onTagClick: (tag: string) => void;
  onRemoveTag: (id: string, tag: string) => void;
  dropPosition?: DropPosition;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function TodoItem({
  todo,
  today,
  tagSuggestions,
  folders,
  folderPath,
  onStatusChange,
  onPriorityChange,
  onDueDateChange,
  onEdit,
  onRemove,
  onTagClick,
  onRemoveTag,
  dropPosition,
  onMoveUp,
  onMoveDown,
}: TodoItemProps) {
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dueStatus = getDueStatus(todo, today);
  const done = todo.status === 'done';

  if (editing) {
    return (
      <li className="rounded-lg border border-blue-300 bg-white p-3 dark:border-blue-800 dark:bg-slate-900">
        <TodoForm
          initial={{ ...todo, repeat: todo.repeat?.frequency ?? null }}
          submitLabel={t('保存')}
          tagSuggestions={tagSuggestions}
          folders={folders}
          onSubmit={async (input) => {
            await onEdit(todo.id, input);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    // Can be dragged onto the folder pane to move it to another folder.
    // A grid so that the rows under the title also use the width under the action buttons
    <li
      data-todo-id={todo.id}
      className={cn(
        'group/item grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900',
        done && 'opacity-60',
        dragging && 'border-dashed border-blue-400 opacity-40',
        dropPosition === 'before' && 'border-t-4 border-t-blue-500',
        dropPosition === 'after' && 'border-b-4 border-b-blue-500',
      )}
    >
      {/* The folder comes first, like a breadcrumb, so the status row below has room to fit on one line.
          It is placed after the checkbox's column, so the checkbox and buttons line up with the title */}
      {folderPath && (
        <p
          className="col-span-2 col-start-2 mb-0.5 flex min-w-0 items-center gap-1 text-xs text-slate-500 dark:text-slate-400"
          title={folderPath}
        >
          <FaFolder className="shrink-0 text-amber-500 dark:text-amber-400" aria-hidden="true" />
          <span className="sr-only">{t('フォルダ: ')}</span>
          <span className="truncate">{folderPath}</span>
        </p>
      )}
      <input
        type="checkbox"
        className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-blue-600"
        checked={done}
        // Unchecking done returns it to 未着手
        onChange={() => onStatusChange(todo.id, done ? 'todo' : 'done')}
        aria-label={t(done ? '「{0}」を未着手に戻す' : '「{0}」を完了にする', [todo.title])}
      />

      <section
        aria-label={t('「{0}」のヘッダー', [todo.title])}
        draggable
        onDragStart={(event) => {
          setDraggedTodo(event.dataTransfer, todo.id, todo.title);
          setDragging(true);
        }}
        onDragEnd={() => setDragging(false)}
        className="flex min-w-0 items-start gap-2 lg:cursor-grab lg:active:cursor-grabbing"
      >
        <FaGripVertical
          className="mt-1 hidden shrink-0 text-slate-300 group-hover/item:text-slate-500 lg:block dark:text-slate-600 dark:group-hover/item:text-slate-400"
          aria-hidden="true"
        />
        <p className={cn('min-w-0 break-words font-medium', done && 'line-through')}>
          {todo.title}
        </p>
      </section>

      <div className="flex shrink-0">
        {onMoveUp && (
          <button
            type="button"
            className={iconButtonClass}
            onClick={onMoveUp}
            aria-label={t('「{0}」を上へ移動', [todo.title])}
            title={t('上へ移動')}
          >
            <FaArrowUp aria-hidden="true" />
          </button>
        )}
        {onMoveDown && (
          <button
            type="button"
            className={iconButtonClass}
            onClick={onMoveDown}
            aria-label={t('「{0}」を下へ移動', [todo.title])}
            title={t('下へ移動')}
          >
            <FaArrowDown aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className={iconButtonClass}
          onClick={() => setEditing(true)}
          aria-label={t('「{0}」を編集', [todo.title])}
        >
          <FaPen aria-hidden="true" />
        </button>
        <button
          type="button"
          className={cn(iconButtonClass, 'hover:text-red-600 dark:hover:text-red-400')}
          onClick={() => onRemove(todo.id)}
          aria-label={t('「{0}」をゴミ箱に移動', [todo.title])}
          title={t('ゴミ箱に移動')}
        >
          <FaTrash aria-hidden="true" />
        </button>
      </div>

      {/* The status, priority, due date, and repeat come before the tags and memo, so they stay in the same place
          whatever the memo's length */}
      <div className="col-span-2 col-start-2 mt-1.5 flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <select
            className={cn(
              'cursor-pointer rounded border px-1 py-0.5 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40',
              STATUS_CLASSES[todo.status],
            )}
            value={todo.status}
            onChange={(event) => onStatusChange(todo.id, event.target.value as TodoStatus)}
            aria-label={t('「{0}」のステータス', [todo.title])}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(STATUS_LABELS[status])}
              </option>
            ))}
          </select>
          {/* Only the icon and the level, so the row fits on one line on narrow screens. The select's name says 優先度 */}
          <span
            className={cn(
              'inline-flex items-center rounded pl-1.5 focus-within:ring-2 focus-within:ring-blue-500/40',
              PRIORITY_CLASSES[todo.priority],
            )}
            title={t('優先度')}
          >
            <FaFlag className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
            <select
              className="cursor-pointer bg-transparent py-0.5 pr-1 pl-1 font-medium focus:outline-none"
              value={todo.priority}
              onChange={(event) => onPriorityChange(todo.id, event.target.value as Priority)}
              aria-label={t('「{0}」の優先度', [todo.title])}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {t(PRIORITY_LABELS[priority])}
                </option>
              ))}
            </select>
          </span>
          {/*
            A date input laid invisibly over the chip, so tapping it opens the browser's date picker.
            Clearing the date in the picker removes the due date. Without a due date it shows 期限なし
            in a dashed outline, so it reads as an empty slot that can be filled
          */}
          <span
            className={cn(
              'relative inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 focus-within:ring-2 focus-within:ring-blue-500/40',
              dueStatus === 'overdue' && 'bg-red-600 font-semibold text-white',
              dueStatus === 'today' && 'bg-orange-500 font-semibold text-white',
              todo.dueDate &&
                (dueStatus === 'upcoming' || dueStatus === 'none') &&
                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
              !todo.dueDate &&
                'border border-dashed border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
            )}
            title={todo.dueDate ? t('期限') : t('期限を設定')}
          >
            <FaCalendarAlt className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
            {todo.dueDate ? (
              <span>
                <span className="sr-only">{t('期限: ')}</span>
                {todo.dueDate.replaceAll('-', '/')}
                {dueStatus === 'overdue' && t(' (期限切れ)')}
                {dueStatus === 'today' && t(' (今日)')}
              </span>
            ) : (
              <span>{t('期限なし')}</span>
            )}
            <input
              type="date"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              value={todo.dueDate ?? ''}
              onChange={(event) => onDueDateChange(todo.id, event.target.value || null)}
              onClick={(event) => {
                // Some browsers open the picker only from the small icon, so open it from anywhere on the chip
                try {
                  event.currentTarget.showPicker();
                } catch {
                  // Not supported or already open; the input still works by keyboard
                }
              }}
              aria-label={t('「{0}」の期限', [todo.title])}
            />
          </span>
          {todo.repeat && (
            <span className="inline-flex items-center gap-1 rounded bg-teal-50 px-1.5 py-0.5 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              <FaRedo className="h-2.5 w-2.5" aria-hidden="true" />
              <span className="sr-only">{t('繰り返し: ')}</span>
              {t(REPEAT_LABELS[todo.repeat.frequency])}
            </span>
          )}
        </div>
        {todo.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {todo.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center overflow-hidden rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              >
                <button
                  type="button"
                  className="cursor-pointer py-0.5 pl-2 pr-1 hover:bg-blue-100 dark:hover:bg-blue-900"
                  onClick={() => onTagClick(tag)}
                  title={t('タグ「{0}」で絞り込む', [tag])}
                >
                  #{tag}
                </button>
                <button
                  type="button"
                  className="cursor-pointer py-1 pl-1 pr-2 hover:bg-blue-100 dark:hover:bg-blue-900"
                  onClick={() => onRemoveTag(todo.id, tag)}
                  aria-label={t('「{0}」からタグ「{1}」を削除', [todo.title, tag])}
                  title={t('タグ「{0}」を削除', [tag])}
                >
                  <FaTimes className="h-2.5 w-2.5" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}
        {todo.memo && <MarkdownMemo>{todo.memo}</MarkdownMemo>}
      </div>
    </li>
  );
}
