import { type DragEvent, useState } from 'react';
import { TodoItem } from '~/components/todo/todo-item';
import { type FolderSelection, formatFolderPath } from '~/lib/folder-tree';
import { getDraggedTodo, isDraggingTodo } from '~/lib/todo-drag';
import type { DropPosition } from '~/lib/todo-order';
import type { Folder } from '~/types/folder';
import type { Priority, Todo, TodoInput, TodoStatus } from '~/types/todo';

interface TodoListProps {
  todos: Todo[];
  folders: Folder[];
  /** 一覧で選んでいるフォルダ。そのフォルダに直接入っている TODO はフォルダ名を出さない */
  folderSelection: FolderSelection;
  today: string;
  tagSuggestions: string[];
  emptyMessage: string;
  onStatusChange: (id: string, status: TodoStatus) => void;
  onPriorityChange: (id: string, priority: Priority) => void;
  onEdit: (id: string, input: TodoInput) => Promise<void>;
  onRemove: (id: string) => void;
  onTagClick: (tag: string) => void;
  onRemoveTag: (id: string, tag: string) => void;
  onReorder?: (id: string, targetId: string, position: DropPosition) => void;
}

export function TodoList({
  todos,
  folders,
  folderSelection,
  emptyMessage,
  onReorder,
  ...itemProps
}: TodoListProps) {
  const [dropTarget, setDropTarget] = useState<{ id: string; position: DropPosition } | null>(null);
  const findDropTarget = (event: DragEvent<HTMLUListElement>) => {
    const row = (event.target as Element).closest<HTMLElement>('li[data-todo-id]');
    const id = row?.dataset.todoId;
    if (!row || !id || !event.currentTarget.contains(row)) return null;
    const rect = row.getBoundingClientRect();
    return {
      id,
      position:
        event.clientY < rect.top + rect.height / 2 ? ('before' as const) : ('after' as const),
    };
  };
  if (todos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul
      className="flex flex-col gap-2"
      aria-label="TODO 一覧"
      onDragOver={(event) => {
        if (!onReorder || !isDraggingTodo(event.dataTransfer)) return;
        const target = findDropTarget(event);
        if (!target) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setDropTarget(target);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null);
      }}
      onDragEnd={() => setDropTarget(null)}
      onDrop={(event) => {
        setDropTarget(null);
        if (!onReorder) return;
        const id = getDraggedTodo(event.dataTransfer);
        const target = findDropTarget(event);
        if (!id || !target) return;
        event.preventDefault();
        onReorder(id, target.id, target.position);
      }}
    >
      {todos.map((todo, index) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          folders={folders}
          dropPosition={onReorder && dropTarget?.id === todo.id ? dropTarget.position : undefined}
          onMoveUp={
            onReorder && index > 0
              ? () => onReorder(todo.id, todos[index - 1].id, 'before')
              : undefined
          }
          onMoveDown={
            onReorder && index < todos.length - 1
              ? () => onReorder(todo.id, todos[index + 1].id, 'after')
              : undefined
          }
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
