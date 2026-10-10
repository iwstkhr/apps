import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { ApiError } from './errors';
import { createQueryClient } from './query-client';
import { useAsyncAction } from './use-async-action';

function renderUseAsyncAction() {
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useAsyncAction(), { wrapper });
}

describe('useAsyncAction', () => {
  it('成功なら true を返し、実行中だけ pending になる', async () => {
    const { result } = renderUseAsyncAction();
    let finish: () => void = () => {};
    const action = () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      });

    let ran: Promise<boolean> = Promise.resolve(false);
    act(() => {
      ran = result.current.run(action);
    });
    await waitFor(() => expect(result.current.pending).toBe(true));

    await act(async () => {
      finish();
      expect(await ran).toBe(true);
    });
    await waitFor(() => expect(result.current).toMatchObject({ pending: false, error: null }));
  });

  it('失敗なら false を返してメッセージを出し、次の実行で消す', async () => {
    const { result } = renderUseAsyncAction();

    await act(async () => {
      const ok = await result.current.run(async () => {
        throw new ApiError('CLOSED', 'このイベントは締め切られています');
      });
      expect(ok).toBe(false);
    });
    await waitFor(() => expect(result.current.error).toBe('このイベントは締め切られています'));

    await act(async () => {
      expect(await result.current.run(async () => {})).toBe(true);
    });
    await waitFor(() => expect(result.current.error).toBeNull());
  });
});
