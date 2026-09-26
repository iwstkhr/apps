import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { errorMessage } from './errors';

/**
 * 「実行中フラグを立てる → 走らせる → 失敗したらメッセージを出す」という
 * 画面側の定型をまとめたもの。実体は TanStack Query の useMutation。
 *
 * 1 つの画面の操作 (保存・締切・削除など) で実行中フラグとエラーを共有したいので、
 * 操作ごとに useMutation を分けず、渡された処理をそのまま走らせる 1 つの mutation にしている。
 * 新しく run() すると前回のエラーは消える。
 *
 * run() は成功したかどうかを boolean で返す。呼び出し側が成功時だけ
 * 後処理 (再取得・遷移) をしたい場合に使う。
 */
export function useAsyncAction() {
  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: (action: () => Promise<void>) => action(),
  });

  const run = useCallback(
    async (action: () => Promise<void>): Promise<boolean> => {
      try {
        await mutateAsync(action);
        return true;
      } catch {
        // エラーは error に入っている
        return false;
      }
    },
    [mutateAsync],
  );

  return { pending: isPending, error: error ? errorMessage(error) : null, run };
}
