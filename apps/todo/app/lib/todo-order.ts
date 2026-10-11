import type { Todo } from '~/types/todo';

export type DropPosition = 'before' | 'after';

export function compareCustomOrder(a: Todo, b: Todo): number {
  const aOrder = a.customOrder ?? Number.MAX_SAFE_INTEGER;
  const bOrder = b.customOrder ?? Number.MAX_SAFE_INTEGER;
  return aOrder - bOrder || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
}

/** Swap only the positions of the shown tasks and keep the order of hidden tasks. */
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
  // If every task already has a non-overlapping order, just swap the numbers held by the shown tasks.
  // Hidden tasks (in other folders or the trash) are not rewritten, so their update times stay the same,
  // and tasks that were "only reordered" are never treated as newer by a merge import
  const slots = shown.map((todo) => todo.customOrder);
  const orders = ordered.map((todo) => todo.customOrder);
  const isStrictlyIncreasing = orders.every(
    (order, index) => order !== null && (index === 0 || order > (orders[index - 1] ?? -1)),
  );
  let byId: Map<string, number>;
  if (isStrictlyIncreasing) {
    byId = new Map(next.map((todo, index) => [todo.id, slots[index] as number]));
  } else {
    // Renumber everything from 0 only when numbers are missing or overlap (older data or imports)
    let shownIndex = 0;
    const ranked = ordered.map((todo) => (visible.has(todo.id) ? next[shownIndex++] : todo));
    byId = new Map(ranked.map((todo, index) => [todo.id, index]));
  }
  return todos.map((todo) => {
    const customOrder = byId.get(todo.id) ?? todo.customOrder ?? 0;
    return todo.customOrder === customOrder
      ? todo
      : { ...todo, customOrder, updatedAt: now.toISOString() };
  });
}
