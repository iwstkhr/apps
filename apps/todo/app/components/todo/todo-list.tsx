import { TodoItem } from '~/components/todo/todo-item';
import { type FolderSelection, formatFolderPath } from '~/lib/folder-tree';
import type { Folder } from '~/types/folder';
import type { Todo, TodoInput, TodoStatus } from '~/types/todo';

interface TodoListProps {
  todos: Todo[];
  folders: Folder[];
  /** 一覧で選んでいるフォルダ。そのフォルダに直接入っている TODO はフォルダ名を出さない */
  folderSelection: FolderSelection;
  today: string;
  tagSuggestions: string[];
  emptyMessage: string;
  onStatusChange: (id: string, status: TodoStatus) => void;
  onEdit: (id: string, input: TodoInput) => Promise<void>;
  onRemove: (id: string) => void;
  onTagClick: (tag: string) => void;
}

export function TodoList({
  todos,
  folders,
  folderSelection,
  emptyMessage,
  ...itemProps
}: TodoListProps) {
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
        <TodoItem
          key={todo.id}
          todo={todo}
          folders={folders}
          folderPath={
            todo.folderId === null || todo.folderId === folderSelection
              ? null
              : formatFolderPath(folders, todo.folderId) || null
          }
          {...itemProps}
        />
      ))}
    </ul>
  );
}
