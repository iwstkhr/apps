export interface Folder {
  id: string;
  name: string;
  /** null なら最上位 */
  parentId: string | null;
  /** ISO 8601 */
  createdAt: string;
  updatedAt: string;
}

/** フォルダの作成・編集ダイアログで入力する項目。 */
export interface FolderInput {
  name: string;
  parentId: string | null;
}

export const FOLDER_NAME_MAX_LENGTH = 100;

export function createFolder(input: FolderInput, now: Date = new Date()): Folder {
  const timestamp = now.toISOString();
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    parentId: input.parentId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateFolder(folder: Folder, input: FolderInput, now: Date = new Date()): Folder {
  return {
    ...folder,
    name: input.name.trim(),
    parentId: input.parentId,
    updatedAt: now.toISOString(),
  };
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

/**
 * 外部から来た値 (インポートしたファイルや DB) を Folder に直す。
 * 必須項目が欠けていれば null を返す。親が存在するかはここでは見ない (sanitizeFolders が見る)。
 */
export function toFolder(value: unknown): Folder | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;

  if (typeof v.id !== 'string' || v.id === '') return null;
  if (typeof v.name !== 'string' || v.name.trim() === '') return null;
  if (!isIsoDateTime(v.createdAt) || !isIsoDateTime(v.updatedAt)) return null;

  return {
    id: v.id,
    name: v.name.trim(),
    parentId: typeof v.parentId === 'string' && v.parentId !== '' ? v.parentId : null,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
}
