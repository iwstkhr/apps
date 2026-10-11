export interface Folder {
  id: string;
  name: string;
  /** null means top level */
  parentId: string | null;
  /** Color of the folder icon (#rrggbb) */
  color: string;
  /** ISO 8601 */
  createdAt: string;
  updatedAt: string;
}

/** Fields entered in the folder create and edit dialog. */
export interface FolderInput {
  name: string;
  parentId: string | null;
  color?: string;
}

export const FOLDER_NAME_MAX_LENGTH = 100;
export const DEFAULT_FOLDER_COLOR = '#f59e0b';

function normalizeFolderColor(value: unknown): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toLowerCase()
    : DEFAULT_FOLDER_COLOR;
}

export function createFolder(input: FolderInput, now: Date = new Date()): Folder {
  const timestamp = now.toISOString();
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    parentId: input.parentId,
    color: normalizeFolderColor(input.color),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateFolder(folder: Folder, input: FolderInput, now: Date = new Date()): Folder {
  return {
    ...folder,
    name: input.name.trim(),
    parentId: input.parentId,
    color: normalizeFolderColor(input.color ?? folder.color),
    updatedAt: now.toISOString(),
  };
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

/**
 * Convert an external value (an imported file or the DB) into a Folder.
 * Returns null if a required field is missing. Whether the parent exists is not checked here (sanitizeFolders does).
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
    color: normalizeFolderColor(v.color),
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
}
