import { useSyncExternalStore } from 'react';
import type { AnswerKey } from './urls';

/**
 * Where manage tokens and response edit keys are kept.
 *
 * So the next person on a shared PC cannot use them, they are never saved in browser storage
 * and live only in memory. They disappear on reload or when the tab closes, but survive navigation within the app
 * (created screen → manage page → event page, etc.).
 * They are carried around through the manage URL / response edit URL.
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

/** Discard all keys for an event when it is deleted. */
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
