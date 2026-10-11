import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { errorMessage } from './errors';

/**
 * Bundles the UI routine of "set a running flag → run → show a message on failure".
 * Backed by TanStack Query's useMutation.
 *
 * Actions on one screen (save, close, delete, etc.) should share the running flag and error,
 * so instead of one useMutation per action, a single mutation runs whatever it is given.
 * A new run() clears the previous error.
 *
 * run() returns a boolean saying whether it succeeded, for callers that want to
 * do follow-up work (refetching, navigation) only on success.
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
        // The error is in error
        return false;
      }
    },
    [mutateAsync],
  );

  return { pending: isPending, error: error ? errorMessage(error) : null, run };
}
