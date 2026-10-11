import { closeDbForTesting } from '~/lib/todo-db';

/** Delete the DB after each test. setup.ts creates an empty DB before the next test. */
export async function resetDb(): Promise<void> {
  await closeDbForTesting();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('todo');
    request.onsuccess = () => resolve();
  });
}

/**
 * Create an empty database in advance. The app adds samples only when it creates the database,
 * so each test starts empty. Opening without a version creates version 1 with no stores,
 * and the app creates only the stores when it opens.
 */
export function createEmptyDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('todo');
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}
