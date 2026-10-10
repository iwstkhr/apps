import { TodoItem } from '~/components/todo/todo-item';
import type { Todo, TodoInput, TodoStatus } from '~/types/todo';

interface TodoListProps {
  todos: Todo[];
  today: string;
  tagSuggestions: string[];
  emptyMessage: string;
  onStatusChange: (id: string, status: TodoStatus) => void;
  onEdit: (id: string, input: TodoInput) => Promise<void>;
  onRemove: (id: string) => void;
  onTagClick: (tag: string) => void;
}

export function TodoList({ todos, emptyMessage, ...itemProps }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2" aria-label="TODO 一覧">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} {...itemProps} />
      ))}
    </ul>
  );
}
