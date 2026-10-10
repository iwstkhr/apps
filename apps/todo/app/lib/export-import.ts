import { type Todo, toLocalDateString, toTodo } from '~/types/todo';

export const EXPORT_APP = 'todo';
export const EXPORT_VERSION = 1;

export interface TodoExport {
  app: typeof EXPORT_APP;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  todos: Todo[];
}

export function createExport(todos: readonly Todo[], now: Date = new Date()): TodoExport {
  return {
    app: EXPORT_APP,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    todos: [...todos],
  };
}

export function exportFileName(now: Date = new Date()): string {
  return `todo-export-${toLocalDateString(now).replaceAll('-', '')}.json`;
}

/** JSON をファイルとして保存させる。 */
export function downloadExport(todos: readonly Todo[], now: Date = new Date()): void {
  const json = JSON.stringify(createExport(todos, now), null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = exportFileName(now);
  document.body.append(link);
  link.click();
  link.remove();
  // クリック直後に解放するとダウンロードが始まらないブラウザがあるので少し待つ
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export class ImportError extends Error {
  override name = 'ImportError';
}

export interface ParsedImport {
  todos: Todo[];
  /** 形式が正しくなく読み飛ばした件数 */
  skipped: number;
}

/** エクスポートしたファイルの中身 (文字列) を検証して TODO を取り出す。 */
export function parseImport(text: string): ParsedImport {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('JSON として読み込めませんでした。');
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ImportError('このアプリでエクスポートしたファイルではありません。');
  }
  const record = data as Record<string, unknown>;
  if (record.app !== EXPORT_APP || !Array.isArray(record.todos)) {
    throw new ImportError('このアプリでエクスポートしたファイルではありません。');
  }
  if (record.version !== EXPORT_VERSION) {
    throw new ImportError(`対応していない形式のバージョンです (${String(record.version)})。`);
  }

  const byId = new Map<string, Todo>();
  let skipped = 0;
  for (const item of record.todos) {
    const todo = toTodo(item);
    if (todo === null) {
      skipped++;
      continue;
    }
    // 同じ id が重複していたら更新日時が新しい方を残す
    const existing = byId.get(todo.id);
    if (existing && existing.updatedAt >= todo.updatedAt) {
      skipped++;
      continue;
    }
    if (existing) skipped++;
    byId.set(todo.id, todo);
  }
  return { todos: [...byId.values()], skipped };
}

/** 今の TODO にインポートした TODO を合わせる。id が同じものは更新日時が新しい方を採る。 */
export function mergeTodos(current: readonly Todo[], incoming: readonly Todo[]): Todo[] {
  const byId = new Map(current.map((todo) => [todo.id, todo]));
  for (const todo of incoming) {
    const existing = byId.get(todo.id);
    if (!existing || Date.parse(todo.updatedAt) > Date.parse(existing.updatedAt)) {
      byId.set(todo.id, todo);
    }
  }
  return [...byId.values()];
}
