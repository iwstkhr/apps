export const PRIORITIES = ['high', 'medium', 'low'] as const;

export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export interface Todo {
  id: string;
  title: string;
  memo: string;
  done: boolean;
  priority: Priority;
  /** 'YYYY-MM-DD' (ローカル日付) */
  dueDate: string | null;
  tags: string[];
  /** ISO 8601 */
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

/** 追加・編集フォームで入力する項目。 */
export interface TodoInput {
  title: string;
  memo: string;
  priority: Priority;
  dueDate: string | null;
  tags: string[];
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && (PRIORITIES as readonly string[]).includes(value);
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
    done: false,
    priority: input.priority,
    dueDate: input.dueDate,
    tags: normalizeTags(input.tags),
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
    updatedAt: now.toISOString(),
  };
}

export function setTodoDone(todo: Todo, done: boolean, now: Date = new Date()): Todo {
  const timestamp = now.toISOString();
  return { ...todo, done, completedAt: done ? timestamp : null, updatedAt: timestamp };
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

  const done = v.done === true;
  return {
    id: v.id,
    title: v.title.trim(),
    memo: typeof v.memo === 'string' ? v.memo : '',
    done,
    priority: isPriority(v.priority) ? v.priority : 'medium',
    dueDate: isDateString(v.dueDate) ? v.dueDate : null,
    tags: Array.isArray(v.tags)
      ? normalizeTags(v.tags.filter((tag): tag is string => typeof tag === 'string'))
      : [],
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
    completedAt: done && isIsoDateTime(v.completedAt) ? v.completedAt : null,
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
  if (todo.done || todo.dueDate === null) return 'none';
  if (todo.dueDate < today) return 'overdue';
  if (todo.dueDate === today) return 'today';
  return 'upcoming';
}
