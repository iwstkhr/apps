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

export const REPEAT_FREQUENCIES = ['daily', 'weekdays', 'weekly', 'monthly', 'yearly'] as const;

export type RepeatFrequency = (typeof REPEAT_FREQUENCIES)[number];

export const REPEAT_LABELS: Record<RepeatFrequency, string> = {
  daily: '毎日',
  weekdays: '平日',
  weekly: '毎週',
  monthly: '毎月',
  yearly: '毎年',
};

export interface Repeat {
  frequency: RepeatFrequency;
  /**
   * The day of the due date (1–31). Remembered so that, after monthly or yearly repeats clamp the 31st to the 30th or 2/28,
   * the next month can return to the original day
   */
  anchorDay: number;
}

export interface Todo {
  id: string;
  title: string;
  memo: string;
  status: TodoStatus;
  priority: Priority;
  /** 'YYYY-MM-DD' (local date) */
  dueDate: string | null;
  tags: string[];
  /** The folder it is in. null means 未分類 */
  folderId: string | null;
  /** Custom display order. null if unset */
  customOrder: number | null;
  /** ISO 8601 */
  createdAt: string;
  updatedAt: string;
  /** When status became 'done'. null after returning to another status */
  completedAt: string | null;
  /** When it was moved to the trash (ISO 8601). null if not in the trash */
  deletedAt: string | null;
  /** Repeat. Completing it creates the next occurrence. null if it does not repeat */
  repeat: Repeat | null;
}

/** Tasks that have been in the trash for this many days are deleted forever when the app opens */
export const TRASH_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Fields entered in the add and edit forms. */
export interface TodoInput {
  title: string;
  memo: string;
  priority: Priority;
  dueDate: string | null;
  tags: string[];
  folderId: string | null;
  /** When omitted, editing keeps the current repeat as is */
  repeat?: RepeatFrequency | null;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && (PRIORITIES as readonly string[]).includes(value);
}

export function isStatus(value: unknown): value is TodoStatus {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value);
}

export function isRepeatFrequency(value: unknown): value is RepeatFrequency {
  return typeof value === 'string' && (REPEAT_FREQUENCIES as readonly string[]).includes(value);
}

export function isDateString(value: unknown): value is string {
  return typeof value === 'string' && DATE_PATTERN.test(value);
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

/** Trim spaces around tags and remove empty and duplicate ones. */
export function normalizeTags(tags: readonly string[]): string[] {
  const result: string[] = [];
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (trimmed && !result.includes(trimmed)) result.push(trimmed);
  }
  return result;
}

/** Turn a comma-separated string (including full-width commas) into an array of tags. */
export function parseTagText(text: string): string[] {
  return normalizeTags(text.split(/[,、，]/));
}

/**
 * Decide the due date and repeat. A repeating task without a due date starts today.
 * anchorDay is the due date's day (it changes along with the due date).
 */
function scheduleOf(
  dueDate: string | null,
  frequency: RepeatFrequency | null,
  now: Date,
): Pick<Todo, 'dueDate' | 'repeat'> {
  if (frequency === null) return { dueDate, repeat: null };
  const due = dueDate ?? toLocalDateString(now);
  return { dueDate: due, repeat: { frequency, anchorDay: Number(due.slice(8, 10)) } };
}

export function createTodo(input: TodoInput, now: Date = new Date()): Todo {
  const timestamp = now.toISOString();
  return {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    memo: input.memo,
    status: 'todo',
    priority: input.priority,
    ...scheduleOf(input.dueDate, input.repeat ?? null, now),
    tags: normalizeTags(input.tags),
    folderId: input.folderId,
    customOrder: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    deletedAt: null,
  };
}

export function updateTodo(todo: Todo, input: TodoInput, now: Date = new Date()): Todo {
  const frequency = input.repeat === undefined ? (todo.repeat?.frequency ?? null) : input.repeat;
  return {
    ...todo,
    title: input.title.trim(),
    memo: input.memo,
    priority: input.priority,
    ...scheduleOf(input.dueDate, frequency, now),
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

/** Move to a folder. Returns the same object if the folder is the same. */
export function moveTodoToFolder(
  todo: Todo,
  folderId: string | null,
  now: Date = new Date(),
): Todo {
  if (todo.folderId === folderId) return todo;
  return { ...todo, folderId, updatedAt: now.toISOString() };
}

export function isTrashed(todo: Todo): boolean {
  return todo.deletedAt !== null;
}

/** Move to the trash. The folder and status are kept, so restoring puts it back in the same place. */
export function moveTodoToTrash(todo: Todo, now: Date = new Date()): Todo {
  if (isTrashed(todo)) return todo;
  const timestamp = now.toISOString();
  return { ...todo, deletedAt: timestamp, updatedAt: timestamp };
}

export function restoreTodoFromTrash(todo: Todo, now: Date = new Date()): Todo {
  if (!isTrashed(todo)) return todo;
  return { ...todo, deletedAt: null, updatedAt: now.toISOString() };
}

/** Days until a task in the trash is deleted automatically (rounded up). 0 means it is due for deletion. */
export function daysUntilPurge(todo: Todo, now: Date = new Date()): number {
  if (todo.deletedAt === null) return Number.POSITIVE_INFINITY;
  const purgeAt = Date.parse(todo.deletedAt) + TRASH_RETENTION_DAYS * DAY_MS;
  return Math.max(0, Math.ceil((purgeAt - now.getTime()) / DAY_MS));
}

export function shouldPurge(todo: Todo, now: Date = new Date()): boolean {
  return isTrashed(todo) && daysUntilPurge(todo, now) === 0;
}

/**
 * Convert an external value (an imported file) into a Todo.
 * Returns null if a required field (id / title / createdAt / updatedAt) is missing,
 * and fills optional fields with defaults. Unknown fields are dropped.
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
    // Whether the folder exists is not checked here (sanitizeTodoFolders does)
    folderId: typeof v.folderId === 'string' && v.folderId !== '' ? v.folderId : null,
    customOrder:
      typeof v.customOrder === 'number' && Number.isSafeInteger(v.customOrder) && v.customOrder >= 0
        ? v.customOrder
        : null,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
    completedAt: status === 'done' && isIsoDateTime(v.completedAt) ? v.completedAt : null,
    // Older data lacks this, so when missing it is read as not in the trash
    deletedAt: isIsoDateTime(v.deletedAt) ? v.deletedAt : null,
    // Older data lacks this, so when missing it is read as not repeating
    repeat: toRepeat(v.repeat, isDateString(v.dueDate) ? v.dueDate : null),
  };
}

/** Validate the repeat. Without a due date the next occurrence cannot be counted, so it does not repeat. */
function toRepeat(value: unknown, dueDate: string | null): Repeat | null {
  if (typeof value !== 'object' || value === null || dueDate === null) return null;
  const { frequency, anchorDay } = value as Record<string, unknown>;
  if (!isRepeatFrequency(frequency)) return null;
  return {
    frequency,
    anchorDay:
      typeof anchorDay === 'number' &&
      Number.isInteger(anchorDay) &&
      anchorDay >= 1 &&
      anchorDay <= 31
        ? anchorDay
        : Number(dueDate.slice(8, 10)),
  };
}

/** Convert a Date into a local 'YYYY-MM-DD'. */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type DueStatus = 'overdue' | 'today' | 'upcoming' | 'none';

/** Whether an incomplete todo's due date has passed or is today. 'none' for completed ones. */
export function getDueStatus(todo: Todo, today: string): DueStatus {
  if (todo.status === 'done' || todo.dueDate === null) return 'none';
  if (todo.dueDate < today) return 'overdue';
  if (todo.dueDate === today) return 'today';
  return 'upcoming';
}

/** Convert 'YYYY-MM-DD' into a Date at local midnight. */
function parseLocalDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Day anchorDay of the given year and month (0-based; 12 or more rolls into the next year). Days missing from that month become its last day. */
function dayInMonth(year: number, monthIndex: number, anchorDay: number): Date {
  const first = new Date(year, monthIndex, 1);
  const last = daysInMonth(first.getFullYear(), first.getMonth());
  return new Date(first.getFullYear(), first.getMonth(), Math.min(anchorDay, last));
}

function step(date: Date, repeat: Repeat): Date {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  switch (repeat.frequency) {
    case 'daily':
      return new Date(y, m, d + 1);
    case 'weekdays': {
      const next = new Date(y, m, d + 1);
      // Move Saturday forward to Monday, and Sunday forward to Monday
      while (next.getDay() === 0 || next.getDay() === 6) next.setDate(next.getDate() + 1);
      return next;
    }
    case 'weekly':
      return new Date(y, m, d + 7);
    case 'monthly':
      return dayInMonth(y, m + 1, repeat.anchorDay);
    case 'yearly':
      return dayInMonth(y + 1, m, repeat.anchorDay);
  }
}

/**
 * The next occurrence's due date. Counted from the original due date, then advanced until it is today or later
 * (so completing an overdue task does not create an occurrence that is overdue from the start).
 */
export function nextDueDate(dueDate: string, repeat: Repeat, today: string): string {
  let next = toLocalDateString(step(parseLocalDate(dueDate), repeat));
  while (next < today) next = toLocalDateString(step(parseLocalDate(next), repeat));
  return next;
}

/** The next occurrence of a repeating task. It inherits the content and repeat, and starts as 未着手. */
export function createNextOccurrence(todo: Todo, now: Date = new Date()): Todo | null {
  if (todo.repeat === null || todo.dueDate === null) return null;
  const timestamp = now.toISOString();
  return {
    ...todo,
    id: crypto.randomUUID(),
    status: 'todo',
    dueDate: nextDueDate(todo.dueDate, todo.repeat, toLocalDateString(now)),
    customOrder: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    deletedAt: null,
  };
}
