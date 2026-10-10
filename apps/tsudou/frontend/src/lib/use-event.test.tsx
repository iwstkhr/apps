import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getEvent } from './api';
import { ApiError } from './errors';
import { createQueryClient } from './query-client';
import type { EventView } from './types';
import { eventQueryKey, useEvent } from './use-event';

vi.mock('./api', () => ({ getEvent: vi.fn() }));
const mockedGetEvent = vi.mocked(getEvent);

const event = (title = '忘年会'): EventView => ({
  id: 'event-1',
  title,
  fee: null,
  memo: null,
  candidates: [],
  closed: false,
  createdAt: '2030-01-01T00:00:00.000Z',
  expiresAt: 2_000_000_000,
  answers: [],
});

function renderUseEvent(eventId: string | undefined) {
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...renderHook(() => useEvent(eventId), { wrapper }) };
}

describe('useEvent', () => {
  beforeEach(() => {
    mockedGetEvent.mockReset();
  });

  it('取得できたらイベントを返す', async () => {
    mockedGetEvent.mockResolvedValue(event());
    const { result } = renderUseEvent('event-1');

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.event?.title).toBe('忘年会'));
    expect(result.current).toMatchObject({ loading: false, error: null, notFound: false });
    expect(mockedGetEvent).toHaveBeenCalledWith('event-1');
  });

  it('存在しなければ notFound', async () => {
    mockedGetEvent.mockResolvedValue(null);
    const { result } = renderUseEvent('event-1');

    await waitFor(() => expect(result.current.notFound).toBe(true));
    expect(result.current).toMatchObject({ event: null, loading: false, error: null });
  });

  it('eventId が無ければ取得せずに notFound', () => {
    const { result } = renderUseEvent(undefined);

    expect(result.current).toMatchObject({ loading: false, notFound: true });
    expect(mockedGetEvent).not.toHaveBeenCalled();
  });

  it('失敗したらメッセージを返す (レート制限はやり直さない)', async () => {
    mockedGetEvent.mockRejectedValue(new ApiError('RATE_LIMITED', 'アクセスが集中しています'));
    const { result } = renderUseEvent('event-1');

    await waitFor(() => expect(result.current.error).toBe('アクセスが集中しています'));
    expect(result.current.loading).toBe(false);
    expect(mockedGetEvent).toHaveBeenCalledTimes(1);
  });

  it('取得済みなら、取り直しに失敗しても表示を続ける', async () => {
    mockedGetEvent.mockResolvedValueOnce(event());
    const { client, result } = renderUseEvent('event-1');
    await waitFor(() => expect(result.current.event).not.toBeNull());

    mockedGetEvent.mockRejectedValue(new ApiError('RATE_LIMITED', 'アクセスが集中しています'));
    await act(() => result.current.reload());

    // キャッシュが失敗の状態になってからも、取得済みのイベントを出し続ける
    await waitFor(() =>
      expect(client.getQueryState(eventQueryKey('event-1'))?.status).toBe('error'),
    );
    expect(result.current.event?.title).toBe('忘年会');
    expect(result.current.error).toBeNull();
  });

  it('reload で取り直し、replace で置き換えられる', async () => {
    mockedGetEvent.mockResolvedValueOnce(event()).mockResolvedValueOnce(event('新年会'));
    const { result } = renderUseEvent('event-1');
    await waitFor(() => expect(result.current.event?.title).toBe('忘年会'));

    await act(() => result.current.reload());
    await waitFor(() => expect(result.current.event?.title).toBe('新年会'));

    act(() => result.current.replace(event('送別会')));
    await waitFor(() => expect(result.current.event?.title).toBe('送別会'));
    expect(mockedGetEvent).toHaveBeenCalledTimes(2);
  });
});
