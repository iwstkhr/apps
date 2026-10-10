import { useState } from 'react';
import {
  FaArrowDown,
  FaArrowUp,
  FaFolder,
  FaGripVertical,
  FaPen,
  FaTimes,
  FaTrash,
} from 'react-icons/fa';
import { MarkdownMemo } from '~/components/todo/markdown-memo';
import { TodoForm } from '~/components/todo/todo-form';
import { cn } from '~/lib/cn';
import { setDraggedTodo } from '~/lib/todo-drag';
import type { DropPosition } from '~/lib/todo-order';
import type { Folder } from '~/types/folder';
import {
  getDueStatus,
  PRIORITIES,
  PRIORITY_LABELS,
  type Priority,
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

// 操作ボタンはクリックできることが分かるよう指のカーソルにする
const iconButtonClass =
  'cursor-pointer rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100';

interface TodoItemProps {
  todo: Todo;
  today: string;
  tagSuggestions: string[];
  folders: Folder[];
  /** 表示するフォルダの道のり。今見ているフォルダと同じなら null */
  folderPath: string | null;
  onStatusChange: (id: string, status: TodoStatus) => void;
  onPriorityChange: (id: string, priority: Priority) => void;
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
          initial={todo}
          submitLabel="保存"
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
    // フォルダ欄へドラッグして別のフォルダに移せる
    <li
      data-todo-id={todo.id}
      className={cn(
        'group/item flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900',
        done && 'opacity-60',
        dragging && 'border-dashed border-blue-400 opacity-40',
        dropPosition === 'before' && 'border-t-4 border-t-blue-500',
        dropPosition === 'after' && 'border-b-4 border-b-blue-500',
      )}
    >
      <input
        type="checkbox"
        className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-blue-600"
        checked={done}
        // 完了を外したときは未着手に戻す
        onChange={() => onStatusChange(todo.id, done ? 'todo' : 'done')}
        aria-label={`「${todo.title}」を${done ? '未着手に戻す' : '完了にする'}`}
      />

      <div className="min-w-0 flex-1">
        <section
          aria-label={`「${todo.title}」のヘッダー`}
          draggable
          onDragStart={(event) => {
            setDraggedTodo(event.dataTransfer, todo.id, todo.title);
            setDragging(true);
          }}
          onDragEnd={() => setDragging(false)}
          className="flex items-start gap-2 lg:cursor-grab lg:active:cursor-grabbing"
        >
          <FaGripVertical
            className="mt-1 hidden shrink-0 text-slate-300 group-hover/item:text-slate-500 lg:block dark:text-slate-600 dark:group-hover/item:text-slate-400"
            aria-hidden="true"
          />
          <p className={cn('min-w-0 break-words font-medium', done && 'line-through')}>
            {todo.title}
          </p>
        </section>
        {todo.memo && <MarkdownMemo>{todo.memo}</MarkdownMemo>}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
          <select
            className={cn(
              'cursor-pointer rounded border px-1 py-0.5 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40',
              STATUS_CLASSES[todo.status],
            )}
            value={todo.status}
            onChange={(event) => onStatusChange(todo.id, event.target.value as TodoStatus)}
            aria-label={`「${todo.title}」のステータス`}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <select
            className={cn(
              'cursor-pointer rounded border border-transparent px-1 py-0.5 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40',
              PRIORITY_CLASSES[todo.priority],
            )}
            value={todo.priority}
            onChange={(event) => onPriorityChange(todo.id, event.target.value as Priority)}
            aria-label={`「${todo.title}」の優先度`}
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                優先度: {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
          {todo.dueDate && (
            <span
              className={cn(
                'rounded px-1.5 py-0.5',
                dueStatus === 'overdue' && 'bg-red-600 font-semibold text-white',
                dueStatus === 'today' && 'bg-orange-500 font-semibold text-white',
                (dueStatus === 'upcoming' || dueStatus === 'none') &&
                  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
              )}
            >
              期限: {todo.dueDate.replaceAll('-', '/')}
              {dueStatus === 'overdue' && ' (期限切れ)'}
              {dueStatus === 'today' && ' (今日)'}
            </span>
          )}
          {folderPath && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <FaFolder aria-hidden="true" />
              <span className="sr-only">フォルダ: </span>
              {folderPath}
            </span>
          )}
          {todo.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center overflow-hidden rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
            >
              <button
                type="button"
                className="cursor-pointer py-0.5 pl-2 pr-1 hover:bg-blue-100 dark:hover:bg-blue-900"
                onClick={() => onTagClick(tag)}
                title={`タグ「${tag}」で絞り込む`}
              >
                #{tag}
              </button>
              <button
                type="button"
                className="cursor-pointer py-1 pl-1 pr-2 hover:bg-blue-100 dark:hover:bg-blue-900"
                onClick={() => onRemoveTag(todo.id, tag)}
                aria-label={`「${todo.title}」からタグ「${tag}」を削除`}
                title={`タグ「${tag}」を削除`}
              >
                <FaTimes className="h-2.5 w-2.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex shrink-0">
        {onMoveUp && (
          <button
            type="button"
            className={iconButtonClass}
            onClick={onMoveUp}
            aria-label={`「${todo.title}」を上へ移動`}
            title="上へ移動"
          >
            <FaArrowUp aria-hidden="true" />
          </button>
        )}
        {onMoveDown && (
          <button
            type="button"
            className={iconButtonClass}
            onClick={onMoveDown}
            aria-label={`「${todo.title}」を下へ移動`}
            title="下へ移動"
          >
            <FaArrowDown aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className={iconButtonClass}
          onClick={() => setEditing(true)}
          aria-label={`「${todo.title}」を編集`}
        >
          <FaPen aria-hidden="true" />
        </button>
        <button
          type="button"
          className={cn(iconButtonClass, 'hover:text-red-600 dark:hover:text-red-400')}
          onClick={() => onRemove(todo.id)}
          aria-label={`「${todo.title}」を削除`}
        >
          <FaTrash aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}
