import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getEvent } from './api';
import { errorMessage } from './errors';
import type { EventView } from './types';

/** イベントのキャッシュのキー。公開ページと管理ページで同じキャッシュを使う。 */
export const eventQueryKey = (eventId: string) => ['event', eventId] as const;

/**
 * イベントの取得 (TanStack Query)。
 *
 * eventId が変わったときに古いレスポンスが後から届いて上書きしないことや、
 * 画面にフォーカスが戻ったときの取り直しは Query に任せる。
 * 管理トークンや回答編集キーはキャッシュに入らない (EventView はトークンを持たない)。
 */
export function useEvent(eventId: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: eventQueryKey(eventId ?? ''),
    queryFn: () => getEvent(eventId as string),
    enabled: eventId !== undefined,
  });

  /** 保存後などに取り直す (イベントハンドラから呼ぶ)。取り直しが終わるまで待てる。 */
  const reload = useCallback(async () => {
    if (!eventId) return;
    await queryClient.invalidateQueries({ queryKey: eventQueryKey(eventId) });
  }, [eventId, queryClient]);

  /** 保存直後にサーバの戻り値でそのまま置き換える (再取得を1往復省く)。 */
  const replace = useCallback(
    (event: EventView) => {
      if (!eventId) return;
      queryClient.setQueryData(eventQueryKey(eventId), event);
    },
    [eventId, queryClient],
  );

  /** イベントを削除したあとにキャッシュからも消す (戻るで古い内容を出さないため)。 */
  const forget = useCallback(() => {
    if (!eventId) return;
    queryClient.removeQueries({ queryKey: eventQueryKey(eventId) });
  }, [eventId, queryClient]);

  return {
    /** 未取得のあいだと、存在しない (期限切れを含む) ときは null。 */
    event: query.data ?? null,
    loading: eventId !== undefined && query.isPending,
    // 取得済みのデータがあるうちは、裏での取り直しに失敗しても表示を続ける
    error: query.data === undefined && query.error ? errorMessage(query.error) : null,
    notFound: eventId === undefined || query.data === null,
    reload,
    replace,
    forget,
  };
}
