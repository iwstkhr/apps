import { type Todo, toTodo } from '~/types/todo';

const DB_NAME = 'todo';
const DB_VERSION = 1;
const STORE = 'todos';

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
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
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

/** 1 つのトランザクションで store を操作し、完了まで待つ。 */
async function withStore(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => void,
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
    run(tx.objectStore(STORE));
  });
}

/** 保存済みの TODO を読む。古い形式で保存されたものも toTodo() で今の形に直す。 */
export async function getAllTodos(): Promise<Todo[]> {
  const db = await openDb();
  const rows = await promisify(db.transaction(STORE, 'readonly').objectStore(STORE).getAll());
  return rows.map(toTodo).filter((todo) => todo !== null);
}

export function putTodos(todos: readonly Todo[]): Promise<void> {
  return withStore('readwrite', (store) => {
    for (const todo of todos) store.put(todo);
  });
}

export function deleteTodos(ids: readonly string[]): Promise<void> {
  return withStore('readwrite', (store) => {
    for (const id of ids) store.delete(id);
  });
}

/** すべて消してから書き込む (インポートの「置き換え」)。途中で失敗したら何も変わらない。 */
export function replaceAllTodos(todos: readonly Todo[]): Promise<void> {
  return withStore('readwrite', (store) => {
    store.clear();
    for (const todo of todos) store.put(todo);
  });
}

/** テスト用: 開いている接続を閉じて忘れる。 */
export async function closeDbForTesting(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise;
  db.close();
  dbPromise = null;
}
