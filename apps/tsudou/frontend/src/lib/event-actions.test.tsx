import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventManage } from '../routes/event-manage';
import {
  deleteAnswer,
  deleteEvent,
  getEvent,
  submitAnswer,
  updateAnswer,
  updateEvent,
} from './api';
import { ApiError } from './errors';
import { LANGUAGE_KEY, setLanguage } from './i18n';
import { forgetEventKeys, setAnswerKey, setManageToken } from './keyring';
import { createQueryClient } from './query-client';
import type { EventView } from './types';
import { eventQueryKey } from './use-event';
import { useManagedEvent } from './use-managed-event';
import { usePublicEvent } from './use-public-event';

vi.mock('./api', () => ({
  getEvent: vi.fn(),
  submitAnswer: vi.fn(),
  updateAnswer: vi.fn(),
  deleteAnswer: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

const answer = {
  id: 'answer-1',
  name: 'guest',
  message: null,
  choices: [{ candidateId: 'c1', status: 'YES' as const }],
  createdAt: '2030-01-01T00:00:00.000Z',
  updatedAt: '2030-01-01T00:00:00.000Z',
};
const event: EventView = {
  id: 'event-1',
  title: 'test event',
  fee: null,
  memo: null,
  closed: false,
  candidates: [{ id: 'c1', startAt: '2030-01-01T10:00:00.000Z' }],
  answers: [],
  createdAt: '2030-01-01T00:00:00.000Z',
  expiresAt: 2_000_000_000,
};
const key = { answerId: answer.id, editToken: 'test-edit-token' }; // leak-guard:ignore テスト専用のダミー
const manageToken = 'test-manage-token'; // leak-guard:ignore テスト専用のダミー
const draft = { name: ' guest ', message: '  ', choices: { c1: 'YES' as const } };
const values = { title: 'updated', fee: null, memo: null, candidates: event.candidates };

beforeEach(() => {
  vi.resetAllMocks();
  forgetEventKeys(event.id);
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
  setLanguage('ja');
  vi.mocked(getEvent).mockResolvedValue(event);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  forgetEventKeys(event.id);
  window.history.replaceState(null, '', '/');
});

function wrapperFor(client: ReturnType<typeof createQueryClient>) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}
function renderPublicHook(hash = '') {
  const client = createQueryClient();
  return {
    client,
    ...renderHook(() => usePublicEvent(event.id, hash), { wrapper: wrapperFor(client) }),
  };
}
function renderManageHook(hash = '') {
  const client = createQueryClient();
  return {
    client,
    ...renderHook(() => useManagedEvent(event.id, hash), { wrapper: wrapperFor(client) }),
  };
}

describe('public event actions', () => {
  it('新規回答の保存中を表示し、編集キーを取り込んで再取得する', async () => {
    let finish!: (value: Awaited<ReturnType<typeof submitAnswer>>) => void;
    vi.mocked(submitAnswer).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { result } = renderPublicHook();
    await waitFor(() => expect(result.current.event).not.toBeNull());
    let saved: Promise<boolean> | undefined;
    act(() => {
      saved = result.current.save(draft);
    });
    await waitFor(() => expect(result.current.submitting).toBe(true));
    vi.mocked(getEvent).mockResolvedValue({ ...event, answers: [answer] });
    await act(async () => {
      finish({ answer, editToken: key.editToken });
      expect(await saved).toBe(true);
    });
    await waitFor(() => expect(result.current.myAnswer).toEqual(answer));
    expect(result.current.mine).toEqual(key);
    expect(result.current.justSaved).toBe(true);
    expect(result.current.submitting).toBe(false);
    expect(submitAnswer).toHaveBeenCalledWith({
      eventId: event.id,
      name: 'guest',
      message: null,
      choices: answer.choices,
    });
    expect(updateAnswer).not.toHaveBeenCalled();
    expect(Object.keys(localStorage)).toEqual([LANGUAGE_KEY]);
    expect(sessionStorage.length).toBe(0);
  });

  it('回答編集 URL の鍵をメモリに取り込み、本人の回答を更新する', async () => {
    const hash = `#a=${answer.id}&k=${key.editToken}`;
    window.history.replaceState({ retained: true }, '', `/e/${event.id}${hash}`);
    vi.mocked(getEvent).mockResolvedValue({ ...event, answers: [answer] });
    vi.mocked(updateAnswer).mockResolvedValue(answer);
    const { result } = renderPublicHook(hash);
    await waitFor(() => expect(result.current.myAnswer).toEqual(answer));
    expect(window.location.hash).toBe('');
    expect(window.history.state).toEqual({ retained: true });
    expect(result.current.initialDraft).toMatchObject({ name: 'guest', choices: { c1: 'YES' } });
    await act(async () => {
      expect(await result.current.save(draft)).toBe(true);
    });
    expect(updateAnswer).toHaveBeenCalledWith({
      answerId: answer.id,
      editToken: key.editToken,
      name: 'guest',
      message: null,
      choices: answer.choices,
    });
    expect(submitAnswer).not.toHaveBeenCalled();
    expect(getEvent).toHaveBeenCalledTimes(2);
  });

  it('回答の削除をキャンセル・失敗した場合は編集キーを維持し、成功したら消す', async () => {
    setAnswerKey(event.id, key);
    vi.mocked(getEvent).mockResolvedValue({ ...event, answers: [answer] });
    const { result } = renderPublicHook();
    await waitFor(() => expect(result.current.myAnswer).toEqual(answer));
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    act(() => {
      result.current.removeMyAnswer();
    });
    expect(deleteAnswer).not.toHaveBeenCalled();
    vi.mocked(deleteAnswer).mockRejectedValueOnce(new ApiError('FORBIDDEN', '編集できません'));
    await act(async () => {
      expect(await result.current.removeMyAnswer()).toBe(false);
    });
    await waitFor(() => expect(result.current.formError).toBe('編集できません'));
    expect(result.current.mine).toEqual(key);
    expect(getEvent).toHaveBeenCalledTimes(1);
    vi.mocked(deleteAnswer).mockResolvedValueOnce(undefined);
    vi.mocked(getEvent).mockResolvedValue(event);
    await act(async () => {
      expect(await result.current.removeMyAnswer()).toBe(true);
    });
    expect(deleteAnswer).toHaveBeenLastCalledWith({
      answerId: answer.id,
      editToken: key.editToken,
    });
    expect(result.current.mine).toBeNull();
    expect(result.current.myAnswer).toBeUndefined();
    expect(getEvent).toHaveBeenCalledTimes(2);
  });

  it('鍵に対応する回答が削除済みなら警告し、新規回答として保存する', async () => {
    setAnswerKey(event.id, key);
    const { result } = renderPublicHook();
    await waitFor(() => expect(result.current.keyIsStale).toBe(true));
    vi.mocked(submitAnswer).mockResolvedValue({ answer, editToken: key.editToken });
    await act(async () => {
      await result.current.save(draft);
    });
    expect(submitAnswer).toHaveBeenCalledTimes(1);
    expect(updateAnswer).not.toHaveBeenCalled();
  });
});

describe('managed event actions', () => {
  it('管理 URL の鍵を取り込み、保存と締切の結果をキャッシュに反映する', async () => {
    const hash = `#k=${manageToken}`;
    window.history.replaceState(null, '', `/e/${event.id}/manage${hash}`);
    const { result, client } = renderManageHook(hash);
    await waitFor(() => expect(result.current.event).not.toBeNull());
    expect(result.current.manageToken).toBe(manageToken);
    expect(window.location.hash).toBe('');
    const updated = { ...event, ...values };
    vi.mocked(updateEvent)
      .mockResolvedValueOnce(updated)
      .mockResolvedValueOnce({ ...updated, closed: true })
      .mockResolvedValueOnce(updated);
    await act(async () => {
      expect(await result.current.save(values)).toBe(true);
    });
    expect(client.getQueryData(eventQueryKey(event.id))).toEqual(updated);
    expect(result.current.saved).toBe(true);
    await act(async () => {
      await result.current.toggleClosed();
    });
    expect(result.current.event?.closed).toBe(true);
    await act(async () => {
      await result.current.toggleClosed();
    });
    expect(updateEvent).toHaveBeenNthCalledWith(2, {
      eventId: event.id,
      manageToken: manageToken,
      closed: true,
    });
    expect(updateEvent).toHaveBeenNthCalledWith(3, {
      eventId: event.id,
      manageToken: manageToken,
      closed: false,
    });
    expect(getEvent).toHaveBeenCalledTimes(1);
    expect(Object.keys(localStorage)).toEqual([LANGUAGE_KEY]);
  });

  it('管理キーがない場合は管理操作を送信しない', async () => {
    const { result } = renderManageHook();
    await waitFor(() => expect(result.current.event).not.toBeNull());
    await act(async () => {
      await result.current.save(values);
      await result.current.toggleClosed();
      await result.current.removeAnswer(answer.id, answer.name);
      await result.current.removeEvent();
    });
    expect(updateEvent).not.toHaveBeenCalled();
    expect(deleteAnswer).not.toHaveBeenCalled();
    expect(deleteEvent).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('管理者の回答削除に管理キーを渡し、成功後に再取得する', async () => {
    setManageToken(event.id, manageToken);
    vi.mocked(getEvent).mockResolvedValue({ ...event, answers: [answer] });
    const { result } = renderManageHook();
    await waitFor(() => expect(result.current.event?.answers).toHaveLength(1));
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    act(() => {
      result.current.removeAnswer(answer.id, answer.name);
    });
    expect(deleteAnswer).not.toHaveBeenCalled();
    vi.mocked(deleteAnswer).mockResolvedValue(undefined);
    vi.mocked(getEvent).mockResolvedValue(event);
    await act(async () => {
      await result.current.removeAnswer(answer.id, answer.name);
    });
    expect(deleteAnswer).toHaveBeenCalledWith({
      answerId: answer.id,
      manageToken: manageToken,
    });
    await waitFor(() => expect(result.current.event?.answers).toEqual([]));
  });

  it('イベント削除が失敗しても画面と鍵を維持し、成功時は鍵とキャッシュを消してトップへ戻る', async () => {
    const user = userEvent.setup();
    setManageToken(event.id, manageToken);
    setAnswerKey(event.id, key);
    const client = createQueryClient();
    const router = createMemoryRouter(
      [
        { path: '/e/:eventId/manage', element: <EventManage /> },
        { path: '/', element: <p>Home after deletion</p> },
      ],
      { initialEntries: [`/e/${event.id}/manage`] },
    );
    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    const button = await screen.findByRole('button', { name: 'イベントを削除' });
    vi.mocked(deleteEvent).mockRejectedValueOnce(new ApiError('FORBIDDEN', '削除できません'));
    await user.click(button);
    await screen.findByText('削除できません');
    expect(router.state.location.pathname).toBe(`/e/${event.id}/manage`);
    expect(client.getQueryData(eventQueryKey(event.id))).toEqual(event);
    vi.mocked(deleteEvent).mockResolvedValueOnce(undefined);
    vi.mocked(getEvent).mockResolvedValue(null);
    await user.click(button);
    await screen.findByText('Home after deletion');
    expect(deleteEvent).toHaveBeenLastCalledWith(event.id, manageToken);
    expect(client.getQueryData(eventQueryKey(event.id))).toBeFalsy();
    const { result } = renderPublicHook();
    expect(result.current.mine).toBeNull();
    expect(result.current.manageToken).toBeNull();
  });
});
