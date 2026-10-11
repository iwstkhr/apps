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
  // すでに全タスクに重ならない順番があれば、表示中のタスクが持っていた番号を入れ替えるだけにする。
  // 非表示 (別フォルダ・ゴミ箱) のタスクを書き換えないので、その更新日時も変わらず、
  // マージのインポートで「並べ替えただけ」のタスクが新しい扱いになることもない
  const slots = shown.map((todo) => todo.customOrder);
  const orders = ordered.map((todo) => todo.customOrder);
  const isStrictlyIncreasing = orders.every(
    (order, index) => order !== null && (index === 0 || order > (orders[index - 1] ?? -1)),
  );
  let byId: Map<string, number>;
  if (isStrictlyIncreasing) {
    byId = new Map(next.map((todo, index) => [todo.id, slots[index] as number]));
  } else {
    // 番号が無い・重なっている (以前のデータやインポート) ときだけ、全体を 0 から振り直す
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
