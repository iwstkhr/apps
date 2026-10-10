import { useState } from 'react';
import { FaPen, FaTrash } from 'react-icons/fa';
import { TodoForm } from '~/components/todo/todo-form';
import { cn } from '~/lib/cn';
import {
  getDueStatus,
  PRIORITY_LABELS,
  type Priority,
  type Todo,
  type TodoInput,
} from '~/types/todo';

const PRIORITY_CLASSES: Record<Priority, string> = {
  high: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  low: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const iconButtonClass =
  'rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100';

interface TodoItemProps {
  todo: Todo;
  today: string;
  tagSuggestions: string[];
  onToggle: (id: string) => void;
  onEdit: (id: string, input: TodoInput) => Promise<void>;
  onRemove: (id: string) => void;
  onTagClick: (tag: string) => void;
}

export function TodoItem({
  todo,
  today,
  tagSuggestions,
  onToggle,
  onEdit,
  onRemove,
  onTagClick,
}: TodoItemProps) {
  const [editing, setEditing] = useState(false);
  const dueStatus = getDueStatus(todo, today);

  if (editing) {
    return (
      <li className="rounded-lg border border-blue-300 bg-white p-3 dark:border-blue-800 dark:bg-slate-900">
        <TodoForm
          initial={todo}
          submitLabel="保存"
          tagSuggestions={tagSuggestions}
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
    <li
      className={cn(
        'flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900',
        todo.done && 'opacity-60',
      )}
    >
      <input
        type="checkbox"
        className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-blue-600"
        checked={todo.done}
        onChange={() => onToggle(todo.id)}
        aria-label={`「${todo.title}」を${todo.done ? '未完了に戻す' : '完了にする'}`}
      />

      <div className="min-w-0 flex-1">
        <p className={cn('break-words font-medium', todo.done && 'line-through')}>{todo.title}</p>
        {todo.memo && (
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-400">
            {todo.memo}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
          <span
            className={cn('rounded px-1.5 py-0.5 font-medium', PRIORITY_CLASSES[todo.priority])}
          >
            優先度: {PRIORITY_LABELS[todo.priority]}
          </span>
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
          {todo.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
              onClick={() => onTagClick(tag)}
              title={`タグ「${tag}」で絞り込む`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      <div className="flex shrink-0">
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
