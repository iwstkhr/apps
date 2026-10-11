import { getLanguage } from '~/lib/i18n';
import { createSampleData } from '~/lib/sample-data';
import { type Folder, toFolder } from '~/types/folder';
import { type Todo, toTodo } from '~/types/todo';

const DB_NAME = 'todo';
// 2: add the folder store
const DB_VERSION = 2;
const TODOS = 'todos';
const FOLDERS = 'folders';
const STORES = [TODOS, FOLDERS] as const;

type StoreName = (typeof STORES)[number];

export interface StoredData {
  todos: Todo[];
  folders: Folder[];
}

let dbPromise: Promise<IDBDatabase> | null = null;

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      }
      // Add the samples only when the database is first created. Not for people who deleted everything or who already use the app
      if (event.oldVersion === 0) {
        const tx = request.transaction as IDBTransaction;
        const { todos, folders } = createSampleData(getLanguage());
        for (const todo of todos) tx.objectStore(TODOS).put(todo);
        for (const folder of folders) tx.objectStore(FOLDERS).put(folder);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      // When a newer version is opened in another tab, close and reopen on the next call
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });
  return dbPromise;
}

/** Rewrite both stores in one transaction and wait for completion. Nothing changes if it fails midway. */
async function write(run: (stores: Record<StoreName, IDBObjectStore>) => void): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
    run({ todos: tx.objectStore(TODOS), folders: tx.objectStore(FOLDERS) });
  });
}

/** Read the saved data. toTodo() / toFolder() check the shape, and unreadable entries are dropped. */
export async function getAll(): Promise<StoredData> {
  const db = await openDb();
  const tx = db.transaction(STORES, 'readonly');
  const [todoRows, folderRows] = await Promise.all([
    promisify(tx.objectStore(TODOS).getAll()),
    promisify(tx.objectStore(FOLDERS).getAll()),
  ]);
  return {
    todos: todoRows.map(toTodo).filter((todo) => todo !== null),
    folders: folderRows.map(toFolder).filter((folder) => folder !== null),
  };
}

/** Write todos and folders together (add and update). */
export function putAll({ todos = [], folders = [] }: Partial<StoredData>): Promise<void> {
  return write((stores) => {
    for (const todo of todos) stores.todos.put(todo);
    for (const folder of folders) stores.folders.put(folder);
  });
}

export function putTodos(todos: readonly Todo[]): Promise<void> {
  return putAll({ todos: [...todos] });
}

/** Write and delete todos in one transaction. */
export function putAndDeleteTodos(put: readonly Todo[], remove: readonly string[]): Promise<void> {
  return write((stores) => {
    for (const todo of put) stores.todos.put(todo);
    for (const id of remove) stores.todos.delete(id);
  });
}

export function deleteTodos(ids: readonly string[]): Promise<void> {
  return write((stores) => {
    for (const id of ids) stores.todos.delete(id);
  });
}

/** Delete a folder and rewrite the todos inside (moving them to 未分類) in one transaction. */
export function deleteFolders(ids: readonly string[], movedTodos: readonly Todo[]): Promise<void> {
  return write((stores) => {
    for (const id of ids) stores.folders.delete(id);
    for (const todo of movedTodos) stores.todos.put(todo);
  });
}

/** Delete everything, then write (the import's 「置き換え」). */
export function replaceAll({ todos, folders }: StoredData): Promise<void> {
  return write((stores) => {
    stores.todos.clear();
    stores.folders.clear();
    for (const todo of todos) stores.todos.put(todo);
    for (const folder of folders) stores.folders.put(folder);
  });
}

/** For tests: close and forget the open connection. */
export async function closeDbForTesting(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise;
  db.close();
  dbPromise = null;
}
