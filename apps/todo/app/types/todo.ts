export const PRIORITIES = ['high', 'medium', 'low'] as const;

export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export const STATUSES = ['todo', 'in_progress', 'on_hold', 'done'] as const;

export type TodoStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<TodoStatus, string> = {
  todo: '未着手',
  in_progress: '進行中',
  on_hold: '保留',
  done: '完了',
};

export interface Todo {
  id: string;
  title: string;
  memo: string;
  status: TodoStatus;
  priority: Priority;
  /** 'YYYY-MM-DD' (ローカル日付) */
  dueDate: string | null;
  tags: string[];
  /** 入っているフォルダ。null なら未分類 */
  folderId: string | null;
  /** ISO 8601 */
  createdAt: string;
  updatedAt: string;
  /** status が 'done' になった日時。ほかのステータスに戻すと null */
  completedAt: string | null;
}

/** 追加・編集フォームで入力する項目。 */
export interface TodoInput {
  title: string;
  memo: string;
  priority: Priority;
  dueDate: string | null;
  tags: string[];
  folderId: string | null;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && (PRIORITIES as readonly string[]).includes(value);
}

export function isStatus(value: unknown): value is TodoStatus {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value);
}

export function isDateString(value: unknown): value is string {
  return typeof value === 'string' && DATE_PATTERN.test(value);
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

/** タグの前後の空白を取り、空や重複を除く。 */
export function normalizeTags(tags: readonly string[]): string[] {
  const result: string[] = [];
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (trimmed && !result.includes(trimmed)) result.push(trimmed);
  }
  return result;
}

/** カンマ (全角含む) 区切りの文字列をタグの配列にする。 */
export function parseTagText(text: string): string[] {
  return normalizeTags(text.split(/[,、，]/));
}

export function createTodo(input: TodoInput, now: Date = new Date()): Todo {
  const timestamp = now.toISOString();
  return {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    memo: input.memo,
    status: 'todo',
    priority: input.priority,
    dueDate: input.dueDate,
    tags: normalizeTags(input.tags),
    folderId: input.folderId,
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
  };
}

export function updateTodo(todo: Todo, input: TodoInput, now: Date = new Date()): Todo {
  return {
    ...todo,
    title: input.title.trim(),
    memo: input.memo,
    priority: input.priority,
    dueDate: input.dueDate,
    tags: normalizeTags(input.tags),
    folderId: input.folderId,
    updatedAt: now.toISOString(),
  };
}

export function setTodoStatus(todo: Todo, status: TodoStatus, now: Date = new Date()): Todo {
  if (todo.status === status) return todo;
  const timestamp = now.toISOString();
  return {
    ...todo,
    status,
    completedAt: status === 'done' ? timestamp : null,
    updatedAt: timestamp,
  };
}

/**
 * 外部から来た値 (インポートしたファイル) を Todo に直す。
 * 必須項目 (id / title / createdAt / updatedAt) が欠けていれば null を返し、
 * 任意項目は既定値で補う。知らない項目は捨てる。
 */
export function toTodo(value: unknown): Todo | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;

  if (typeof v.id !== 'string' || v.id === '') return null;
  if (typeof v.title !== 'string' || v.title.trim() === '') return null;
  if (!isIsoDateTime(v.createdAt) || !isIsoDateTime(v.updatedAt)) return null;

  const status: TodoStatus = isStatus(v.status) ? v.status : 'todo';
  return {
    id: v.id,
    title: v.title.trim(),
    memo: typeof v.memo === 'string' ? v.memo : '',
    status,
    priority: isPriority(v.priority) ? v.priority : 'medium',
    dueDate: isDateString(v.dueDate) ? v.dueDate : null,
    tags: Array.isArray(v.tags)
      ? normalizeTags(v.tags.filter((tag): tag is string => typeof tag === 'string'))
      : [],
    // フォルダが存在するかはここでは見ない (sanitizeTodoFolders が見る)
    folderId: typeof v.folderId === 'string' && v.folderId !== '' ? v.folderId : null,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
    completedAt: status === 'done' && isIsoDateTime(v.completedAt) ? v.completedAt : null,
  };
}

/** Date をローカル時刻の 'YYYY-MM-DD' にする。 */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type DueStatus = 'overdue' | 'today' | 'upcoming' | 'none';

/** 未完了の TODO の期限が過ぎているか・今日か。完了済みは 'none'。 */
export function getDueStatus(todo: Todo, today: string): DueStatus {
  if (todo.status === 'done' || todo.dueDate === null) return 'none';
  if (todo.dueDate < today) return 'overdue';
  if (todo.dueDate === today) return 'today';
  return 'upcoming';
}
