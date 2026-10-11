import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getEvent } from './api';
import { errorMessage } from './errors';
import type { EventView } from './types';

/** Cache key for an event. The public page and the manage page share the same cache. */
export const eventQueryKey = (eventId: string) => ['event', eventId] as const;

/**
 * Fetch an event (TanStack Query).
 *
 * Query takes care of stale responses arriving late and overwriting after eventId changes,
 * and of refetching when the window regains focus.
 * Manage tokens and response edit keys never enter the cache (EventView holds no tokens).
 */
export function useEvent(eventId: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: eventQueryKey(eventId ?? ''),
    queryFn: () => getEvent(eventId as string),
    enabled: eventId !== undefined,
  });

  /** Refetch, e.g. after saving (called from event handlers). The caller can wait until the refetch finishes. */
  const reload = useCallback(async () => {
    if (!eventId) return;
    await queryClient.invalidateQueries({ queryKey: eventQueryKey(eventId) });
  }, [eventId, queryClient]);

  /** Replace with the server's response right after saving (saves one round trip of refetching). */
  const replace = useCallback(
    (event: EventView) => {
      if (!eventId) return;
      queryClient.setQueryData(eventQueryKey(eventId), event);
    },
    [eventId, queryClient],
  );

  /** Remove the event from the cache too after deleting it (so going back does not show stale content). */
  const forget = useCallback(() => {
    if (!eventId) return;
    queryClient.removeQueries({ queryKey: eventQueryKey(eventId) });
  }, [eventId, queryClient]);

  return {
    /** null while not yet fetched and when it does not exist (including expired). */
    event: query.data ?? null,
    loading: eventId !== undefined && query.isPending,
    // While fetched data exists, keep showing it even if a background refetch fails
    error: query.data === undefined && query.error ? errorMessage(query.error) : null,
    notFound: eventId === undefined || query.data === null,
    reload,
    replace,
    forget,
  };
}
