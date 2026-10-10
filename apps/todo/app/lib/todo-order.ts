import type { Todo } from '~/types/todo';

export type DropPosition = 'before' | 'after';

export function compareCustomOrder(a: Todo, b: Todo): number {
  const aOrder = a.customOrder ?? Number.MAX_SAFE_INTEGER;
  const bOrder = b.customOrder ?? Number.MAX_SAFE_INTEGER;
  return aOrder - bOrder || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
}

/** 表示中のタスクの位置だけを入れ替え、非表示のタスクの並びを保つ。 */
export function reorderTodos(
  todos: readonly Todo[],
  visibleIds: readonly string[],
  movedId: string,
  targetId: string,
  position: DropPosition,
  now: Date = new Date(),
): Todo[] {
  const visible = new Set(visibleIds);
  const ordered = [...todos].sort(compareCustomOrder);
  const shown = ordered.filter((todo) => visible.has(todo.id));
  const moved = shown.find((todo) => todo.id === movedId);
  if (!moved || movedId === targetId || !shown.some((todo) => todo.id === targetId))
    return [...todos];
  const next = shown.filter((todo) => todo.id !== movedId);
  const targetIndex = next.findIndex((todo) => todo.id === targetId);
  next.splice(targetIndex + Number(position === 'after'), 0, moved);
  if (next.every((todo, index) => todo === shown[index])) return [...todos];
  let shownIndex = 0;
  const ranked = ordered.map((todo) => (visible.has(todo.id) ? next[shownIndex++] : todo));
  const byId = new Map(ranked.map((todo, index) => [todo.id, index]));
  return todos.map((todo) => {
    const customOrder = byId.get(todo.id) ?? 0;
    return todo.customOrder === customOrder
      ? todo
      : { ...todo, customOrder, updatedAt: now.toISOString() };
  });
}
