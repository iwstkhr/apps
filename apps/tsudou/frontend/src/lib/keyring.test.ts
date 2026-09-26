import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  forgetEventKeys,
  setAnswerKey,
  setManageToken,
  useAnswerKey,
  useManageToken,
} from './keyring';

describe('keyring', () => {
  it('イベントごとにキーを持ち、変更すると再描画される', () => {
    const manage = renderHook(() => useManageToken('evt-a'));
    const answer = renderHook(() => useAnswerKey('evt-a'));
    expect(manage.result.current).toBeNull();

    act(() => {
      setManageToken('evt-a', 'mt');
      setManageToken('evt-b', 'other');
      setAnswerKey('evt-a', { answerId: 'ans', editToken: 'et' });
    });
    expect(manage.result.current).toBe('mt');
    expect(answer.result.current).toEqual({ answerId: 'ans', editToken: 'et' });

    act(() => setAnswerKey('evt-a', null));
    expect(answer.result.current).toBeNull();

    act(() => forgetEventKeys('evt-a'));
    expect(manage.result.current).toBeNull();
  });

  it('ブラウザのストレージには何も書き込まない', () => {
    localStorage.clear();
    setManageToken('evt-c', 'mt');
    setAnswerKey('evt-c', { answerId: 'ans', editToken: 'et' });
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
