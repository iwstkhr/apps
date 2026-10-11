import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './errors';

/**
 * Cache for server data (events). Only one is created for the whole app (main.tsx).
 * Tests recreate it every time with createQueryClient() so no cache is shared between cases.
 *
 * Refetching when the window regains focus (refetchOnWindowFocus) stays enabled as by default.
 * Even if the manage page is left open, returning to the tab shows new responses.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Retry once only for network failures and unexpected server errors.
        // Things like rate limiting give the same result however often they are sent, so show the error immediately
        retry: (failureCount, error) =>
          failureCount < 1 &&
          error instanceof ApiError &&
          (error.code === 'NETWORK' || error.code === 'INTERNAL'),
      },
    },
  });
}

export const queryClient = createQueryClient();
