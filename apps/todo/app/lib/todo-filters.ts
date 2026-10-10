import { PRIORITIES, type Todo } from '~/types/todo';

export type StatusFilter = 'all' | 'active' | 'done';
export type SortKey = 'due' | 'priority' | 'created';

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
  if (status === 'active') return !todo.done;
  if (status === 'done') return todo.done;
  return true;
}

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
    case 'created':
      return newerFirst;
  }
}

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
    .sort((a, b) => Number(a.done) - Number(b.done) || compare(a, b));
}

/** すべての TODO に付いているタグを名前順で返す。 */
export function collectTags(todos: readonly Todo[]): string[] {
  return [...new Set(todos.flatMap((todo) => todo.tags))].sort((a, b) => a.localeCompare(b, 'ja'));
}
