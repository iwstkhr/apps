import { closeDbForTesting } from '~/lib/todo-db';

/** テストごとに DB を消す。次のテストの前に setup.ts が空の DB を作る。 */
export async function resetDb(): Promise<void> {
  await closeDbForTesting();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('todo');
    request.onsuccess = () => resolve();
  });
}

/**
 * 空のデータベースを先に作っておく。アプリは初めて作るときだけサンプルを入れるので、
 * こうしておくと各テストは空の状態から始まる。バージョンを付けずに開くと store の無い
 * バージョン 1 ができ、アプリが開くときに store だけが作られる。
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
