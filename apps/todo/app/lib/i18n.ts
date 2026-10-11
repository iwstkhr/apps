import { useSyncExternalStore } from 'react';
import { english } from '~/lib/translations';

// As in tsudou, the Japanese text itself is the key used to look up the English translation.
// User-entered content such as task and folder names is not translated.

// Listed in the menu in this order
export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'ja', label: '日本語' },
] as const;
export type Language = (typeof LANGUAGES)[number]['id'];
export const LANGUAGE_KEY = 'todo:language';

const listeners = new Set<() => void>();
// Remember the chosen language for this page only in environments that cannot save it (e.g. private mode)
let unsavedLanguage: Language | null = null;
// t() is called hundreds of times per render, so localStorage is read only once and cached.
// undefined means not read yet; null means nothing is saved
let savedLanguage: Language | null | undefined;

function readSavedLanguage(): Language | null {
  if (savedLanguage !== undefined) return savedLanguage;
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    savedLanguage = isLanguage(saved) ? saved : null;
  } catch {
    // Show the browser's language even when storage cannot be read
    savedLanguage = null;
  }
  return savedLanguage;
}

/** For tests: forget the cached language so it is read from localStorage again next time. */
export function forgetSavedLanguageForTesting(): void {
  savedLanguage = undefined;
  unsavedLanguage = null;
}

function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language.id === value);
}

/** The first supported language among the browser's preferred languages. English if none is supported. */
export function getBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en';
  const locales = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const locale of locales) {
    const language = locale?.split('-')[0]?.toLowerCase();
    if (isLanguage(language)) return language;
  }
  return 'en';
}

/** The chosen language. Follows the browser's language if none has been chosen. */
export function getLanguage(): Language {
  return unsavedLanguage ?? readSavedLanguage() ?? getBrowserLanguage();
}

/** Match the html lang, the tab title, and the description to the language. */
export function applyLanguage(language: Language): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
  document.title = appTitle(language);
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', translate(language, APP_DESCRIPTION));
}

/** The tagline shown next to the header title and in the tab title */
export const APP_TAGLINE = 'ブラウザで完結';

/** "TODO | tagline" shown in the browser tab */
export function appTitle(language: Language): string {
  return `TODO | ${translate(language, APP_TAGLINE)}`;
}

export const APP_DESCRIPTION =
  'ブラウザだけで使える TODO 管理アプリ。データは端末の中にだけ保存されます。';

export function setLanguage(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
    unsavedLanguage = null;
    savedLanguage = language;
  } catch {
    unsavedLanguage = language;
  }
  applyLanguage(language);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Follow language changes made in another tab
  const onStorage = (event: StorageEvent) => {
    if (event.key === LANGUAGE_KEY || event.key === null) {
      unsavedLanguage = null;
      savedLanguage = undefined;
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

/**
 * The current language. Components using this hook re-render when the language changes.
 * Used at the top of the page (Home), everything below switches just by calling t().
 * The HTML generated at build time contains no page content, so the server-side value comes from the same function.
 */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, getLanguage, getLanguage);
}

function translate(language: Language, source: string, values: readonly (string | number)[] = []) {
  // Words that share one Japanese form but differ in English use "Japanese|context" as the key. Japanese shows only the part before |
  const japanese = source.split('|')[0] ?? source;
  const text = language === 'en' ? (english[source] ?? japanese) : japanese;
  return text.replace(/\{(\d+)\}/g, (match, index: string) =>
    String(values[Number(index)] ?? match),
  );
}

/** Translate app text into the current language. Placeholders such as {0} are replaced with values (values are not translated). */
export function t(source: string, values: readonly (string | number)[] = []): string {
  return translate(getLanguage(), source, values);
}
