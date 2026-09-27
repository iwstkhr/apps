import { useSyncExternalStore } from 'react';
import { english } from './translations';

export type Language = 'ja' | 'en';
export const LANGUAGE_KEY = 'tsudou:language';
const listeners = new Set<() => void>();
let unsavedLanguage: Language | null = null;

function getBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en';
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const locale of languages) {
    const language = locale?.split('-')[0]?.toLowerCase();
    if (language === 'ja' || language === 'en') return language;
  }
  return 'en';
}

export function getLanguage(): Language {
  if (unsavedLanguage) return unsavedLanguage;
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved === 'ja' || saved === 'en') return saved;
  } catch {
    // Use the browser preference when storage is unavailable.
  }
  return getBrowserLanguage();
}

export function applyLanguage(language: Language) {
  document.documentElement.lang = language;
  document.title = language === 'en' ? 'Tsudou | Event scheduling' : 'Tsudou｜イベント日程調整';
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute(
      'content',
      language === 'en'
        ? 'Schedule events with Tsudou without signing in.'
        : 'Tsudou はログイン不要でイベントの日程調整ができるアプリです。',
    );
}

export function setLanguage(language: Language) {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
    unsavedLanguage = null;
  } catch {
    unsavedLanguage = language;
    // Keep the current choice in memory if browser storage is unavailable.
  }
  applyLanguage(language);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === LANGUAGE_KEY || event.key === null) {
      unsavedLanguage = null;
      applyLanguage(getLanguage());
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useLanguage() {
  return useSyncExternalStore(subscribe, getLanguage, () => 'en' as const);
}

/** Translate application text only. Interpolated values are rendered as plain text. */
export function t(source: string, values: readonly (string | number)[] = []): string {
  const text = getLanguage() === 'en' ? (english[source] ?? translateValidation(source)) : source;
  return text.replace(/\{(\d+)\}/g, (match, index: string) =>
    String(values[Number(index)] ?? match),
  );
}

function translateValidation(source: string): string {
  const required = source.match(/^(.*)を入力してください$/);
  if (required) return `Enter ${english[required[1] ?? ''] ?? required[1]}.`;
  const tooLong = source.match(/^(.*)は(\d+)文字以内で入力してください$/);
  if (tooLong)
    return `${english[tooLong[1] ?? ''] ?? tooLong[1]} must be ${tooLong[2]} characters or fewer.`;
  const candidateLimit = source.match(/^日時の候補は(\d+)件までです$/);
  if (candidateLimit) return `Add no more than ${candidateLimit[1]} candidate dates.`;
  const feeLimit = source.match(/^参加費は ([\d,]+) 円以下で入力してください$/);
  if (feeLimit) return `The fee must be ${feeLimit[1]} yen or less.`;
  const feeRange = source.match(/^参加費は 0〜([\d,]+) 円の範囲で入力してください$/);
  if (feeRange) return `The fee must be between 0 and ${feeRange[1]} yen.`;
  return source;
}
