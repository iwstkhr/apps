import { closeDbForTesting } from '~/lib/todo-db';

/** テストごとに DB を消して、次のテストが空の状態から始まるようにする。 */
export async function resetDb(): Promise<void> {
  await closeDbForTesting();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('todo');
    request.onsuccess = () => resolve();
  });
}
