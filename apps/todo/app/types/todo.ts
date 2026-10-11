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
   * 期限の「日」(1〜31)。毎月・毎年で 31 日を 30 日や 2/28 にそろえた後も、
   * 次の月で元の日に戻すために覚えておく
   */
  anchorDay: number;
}

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
  /** カスタム表示順。未設定なら null */
  customOrder: number | null;
  /** ISO 8601 */
  createdAt: string;
  updatedAt: string;
  /** status が 'done' になった日時。ほかのステータスに戻すと null */
  completedAt: string | null;
  /** ゴミ箱に移した日時 (ISO 8601)。ゴミ箱に無ければ null */
  deletedAt: string | null;
  /** 繰り返し。完了にすると次の回を作る。繰り返さなければ null */
  repeat: Repeat | null;
}

/** ゴミ箱に入れてからこの日数がたったタスクは、アプリを開いたときに完全に削除する */
export const TRASH_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 追加・編集フォームで入力する項目。 */
export interface TodoInput {
  title: string;
  memo: string;
  priority: Priority;
  dueDate: string | null;
  tags: string[];
  folderId: string | null;
  /** 省略すると、編集では今の繰り返しをそのまま残す */
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

/**
 * 期限と繰り返しを決める。繰り返すのに期限が無ければ今日から始める。
 * anchorDay は期限の日にする (期限を変えたら合わせて変わる)。
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

/** フォルダを移す。同じフォルダなら同じオブジェクトを返す。 */
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

/** ゴミ箱に移す。フォルダやステータスはそのまま残し、元に戻したときに同じ場所へ戻す。 */
export function moveTodoToTrash(todo: Todo, now: Date = new Date()): Todo {
  if (isTrashed(todo)) return todo;
  const timestamp = now.toISOString();
  return { ...todo, deletedAt: timestamp, updatedAt: timestamp };
}

export function restoreTodoFromTrash(todo: Todo, now: Date = new Date()): Todo {
  if (!isTrashed(todo)) return todo;
  return { ...todo, deletedAt: null, updatedAt: now.toISOString() };
}

/** ゴミ箱のタスクが自動で削除されるまでの日数 (切り上げ)。0 なら削除の対象。 */
export function daysUntilPurge(todo: Todo, now: Date = new Date()): number {
  if (todo.deletedAt === null) return Number.POSITIVE_INFINITY;
  const purgeAt = Date.parse(todo.deletedAt) + TRASH_RETENTION_DAYS * DAY_MS;
  return Math.max(0, Math.ceil((purgeAt - now.getTime()) / DAY_MS));
}

export function shouldPurge(todo: Todo, now: Date = new Date()): boolean {
  return isTrashed(todo) && daysUntilPurge(todo, now) === 0;
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
    customOrder:
      typeof v.customOrder === 'number' && Number.isSafeInteger(v.customOrder) && v.customOrder >= 0
        ? v.customOrder
        : null,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
    completedAt: status === 'done' && isIsoDateTime(v.completedAt) ? v.completedAt : null,
    // 以前のデータには無いので、無ければゴミ箱に入っていないものとして読む
    deletedAt: isIsoDateTime(v.deletedAt) ? v.deletedAt : null,
    // 以前のデータには無いので、無ければ繰り返さないものとして読む
    repeat: toRepeat(v.repeat, isDateString(v.dueDate) ? v.dueDate : null),
  };
}

/** 繰り返しを検証する。期限が無いと次の回を数えられないので繰り返さない。 */
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

/** 'YYYY-MM-DD' をローカル時刻の 0 時の Date にする。 */
function parseLocalDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** 年・月 (0 始まり、12 以上は翌年) の anchorDay 日。その月に無い日は月末にする。 */
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
      // 土曜は月曜まで、日曜は月曜まで進める
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
 * 次の回の期限。元の期限から数え、それでも今日より前なら今日以降になるまで進める
 * (期限切れのまま完了しても、次の回が最初から期限切れにならないように)。
 */
export function nextDueDate(dueDate: string, repeat: Repeat, today: string): string {
  let next = toLocalDateString(step(parseLocalDate(dueDate), repeat));
  while (next < today) next = toLocalDateString(step(parseLocalDate(next), repeat));
  return next;
}

/** 繰り返すタスクの次の回。内容と繰り返しは受け継ぎ、未着手から始める。 */
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
