import { PRIORITIES, type Todo, type TodoStatus } from '~/types/todo';

/** 'active' は完了以外のすべて */
export type StatusFilter = 'all' | 'active' | TodoStatus;
export type SortKey = 'due' | 'priority' | 'status' | 'created';

export interface TodoFilters {
  keyword: string;
  status: StatusFilter;
  /** null ならタグで絞り込まない */
  tag: string | null;
  sort: SortKey;
}

export const DEFAULT_FILTERS: TodoFilters = {
  keyword: '',
  status: 'all',
  tag: null,
  sort: 'due',
};

function matchesKeyword(todo: Todo, keyword: string): boolean {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return true;
  return (
    todo.title.toLowerCase().includes(needle) ||
    todo.memo.toLowerCase().includes(needle) ||
    todo.tags.some((tag) => tag.toLowerCase().includes(needle))
  );
}

function matchesStatus(todo: Todo, status: StatusFilter): boolean {
  if (status === 'all') return true;
  if (status === 'active') return todo.status !== 'done';
  return todo.status === status;
}

// ステータス順は手を付けているものを先に出す
const STATUS_ORDER: readonly TodoStatus[] = ['in_progress', 'todo', 'on_hold', 'done'];
const statusRank = (todo: Todo) => STATUS_ORDER.indexOf(todo.status);

const priorityRank = (todo: Todo) => PRIORITIES.indexOf(todo.priority);

// 期限なしは最後に回す
const dueRank = (todo: Todo) => todo.dueDate ?? '9999-99-99';

function compareBy(sort: SortKey): (a: Todo, b: Todo) => number {
  const newerFirst = (a: Todo, b: Todo) => b.createdAt.localeCompare(a.createdAt);
  switch (sort) {
    case 'due':
      return (a, b) =>
        dueRank(a).localeCompare(dueRank(b)) ||
        priorityRank(a) - priorityRank(b) ||
        newerFirst(a, b);
    case 'priority':
      return (a, b) =>
        priorityRank(a) - priorityRank(b) ||
        dueRank(a).localeCompare(dueRank(b)) ||
        newerFirst(a, b);
    case 'status':
      return (a, b) =>
        statusRank(a) - statusRank(b) ||
        dueRank(a).localeCompare(dueRank(b)) ||
        priorityRank(a) - priorityRank(b) ||
        newerFirst(a, b);
    case 'created':
      return newerFirst;
  }
}

const isDone = (todo: Todo) => Number(todo.status === 'done');

/** 絞り込んで並べる。未完了を先、完了済みを後ろにまとめる。 */
export function applyFilters(todos: readonly Todo[], filters: TodoFilters): Todo[] {
  const compare = compareBy(filters.sort);
  return todos
    .filter(
      (todo) =>
        matchesStatus(todo, filters.status) &&
        matchesKeyword(todo, filters.keyword) &&
        (filters.tag === null || todo.tags.includes(filters.tag)),
    )
    .sort((a, b) => isDone(a) - isDone(b) || compare(a, b));
}

/** 状態の絞り込みごとの件数。 */
export function countByStatus(todos: readonly Todo[]): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = {
    all: todos.length,
    active: 0,
    todo: 0,
    in_progress: 0,
    on_hold: 0,
    done: 0,
  };
  for (const todo of todos) {
    counts[todo.status]++;
    if (todo.status !== 'done') counts.active++;
  }
  return counts;
}

/** すべての TODO に付いているタグを名前順で返す。 */
export function collectTags(todos: readonly Todo[]): string[] {
  return [...new Set(todos.flatMap((todo) => todo.tags))].sort((a, b) => a.localeCompare(b, 'ja'));
}
