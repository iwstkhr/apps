import { type Folder, toFolder } from '~/types/folder';
import { type Todo, toTodo } from '~/types/todo';

const DB_NAME = 'todo';
// 2: フォルダの store を追加
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
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      // 別タブで新しいバージョンが開かれたら閉じて、次の呼び出しで開き直す
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

/** 1 つのトランザクションで両方の store を書き換え、完了まで待つ。途中で失敗したら何も変わらない。 */
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

/** 保存済みのデータを読む。toTodo() / toFolder() で形を確かめ、読めないものは捨てる。 */
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

/** TODO とフォルダをまとめて書き込む (追加・更新)。 */
export function putAll({ todos = [], folders = [] }: Partial<StoredData>): Promise<void> {
  return write((stores) => {
    for (const todo of todos) stores.todos.put(todo);
    for (const folder of folders) stores.folders.put(folder);
  });
}

export function putTodos(todos: readonly Todo[]): Promise<void> {
  return putAll({ todos: [...todos] });
}

export function deleteTodos(ids: readonly string[]): Promise<void> {
  return write((stores) => {
    for (const id of ids) stores.todos.delete(id);
  });
}

/** フォルダを消し、中の TODO を書き換える (未分類に移す) のを 1 つのトランザクションで行う。 */
export function deleteFolders(ids: readonly string[], movedTodos: readonly Todo[]): Promise<void> {
  return write((stores) => {
    for (const id of ids) stores.folders.delete(id);
    for (const todo of movedTodos) stores.todos.put(todo);
  });
}

/** すべて消してから書き込む (インポートの「置き換え」)。 */
export function replaceAll({ todos, folders }: StoredData): Promise<void> {
  return write((stores) => {
    stores.todos.clear();
    stores.folders.clear();
    for (const todo of todos) stores.todos.put(todo);
    for (const folder of folders) stores.folders.put(folder);
  });
}

/** テスト用: 開いている接続を閉じて忘れる。 */
export async function closeDbForTesting(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise;
  db.close();
  dbPromise = null;
}
