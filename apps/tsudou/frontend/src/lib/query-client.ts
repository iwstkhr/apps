import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './errors';

/**
 * サーバ由来のデータ (イベント) のキャッシュ。アプリ全体で 1 つだけ作る (main.tsx)。
 * テストは毎回 createQueryClient() で作り直し、ケース間でキャッシュを共有しない。
 *
 * 画面にフォーカスが戻ったときの取り直し (refetchOnWindowFocus) は既定のまま有効にしておく。
 * 管理画面を開いたままにしていても、タブに戻れば新しい回答が見える。
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 通信の失敗とサーバの想定外エラーだけ 1 回やり直す。
        // レート制限などは何度送っても同じなので、すぐにエラーを見せる
        retry: (failureCount, error) =>
          failureCount < 1 &&
          error instanceof ApiError &&
          (error.code === 'NETWORK' || error.code === 'INTERNAL'),
      },
    },
  });
}

export const queryClient = createQueryClient();
