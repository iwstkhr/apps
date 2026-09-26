import { useSyncExternalStore } from 'react';
import type { AnswerKey } from './urls';

/**
 * 管理トークンと回答編集キーの置き場所。
 *
 * 共有 PC で次の利用者に使われないよう、ブラウザのストレージには保存せず
 * メモリにだけ持つ。再読み込みやタブを閉じると消えるが、アプリ内の画面遷移
 * (作成完了 → 管理ページ → イベントページ など) では保たれる。
 * 持ち運びは管理用 URL / 回答編集 URL で行う。
 */

const manageTokens = new Map<string, string>();
const answerKeys = new Map<string, AnswerKey>();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setManageToken(eventId: string, manageToken: string): void {
  manageTokens.set(eventId, manageToken);
  notify();
}

export function setAnswerKey(eventId: string, key: AnswerKey | null): void {
  if (key) answerKeys.set(eventId, key);
  else answerKeys.delete(eventId);
  notify();
}

/** イベントを削除したときに、そのイベントのキーをまとめて捨てる。 */
export function forgetEventKeys(eventId: string): void {
  manageTokens.delete(eventId);
  answerKeys.delete(eventId);
  notify();
}

export function useManageToken(eventId: string | undefined): string | null {
  return useSyncExternalStore(subscribe, () =>
    eventId ? (manageTokens.get(eventId) ?? null) : null,
  );
}

export function useAnswerKey(eventId: string | undefined): AnswerKey | null {
  return useSyncExternalStore(subscribe, () =>
    eventId ? (answerKeys.get(eventId) ?? null) : null,
  );
}
