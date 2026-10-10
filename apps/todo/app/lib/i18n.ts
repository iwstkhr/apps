import { useSyncExternalStore } from 'react';
import { english } from '~/lib/translations';

// tsudou と同じく、日本語の文言をそのままキーにして英語の訳を引く。
// タスク名やフォルダ名など、利用者が入力した内容は訳さない。

// メニューにはこの順に並ぶ
export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'ja', label: '日本語' },
] as const;
export type Language = (typeof LANGUAGES)[number]['id'];
export const LANGUAGE_KEY = 'todo:language';

const listeners = new Set<() => void>();
// 保存できない環境 (プライベートモードなど) で選んだ言語をこの画面の間だけ覚えておく
let unsavedLanguage: Language | null = null;

function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language.id === value);
}

/** ブラウザの優先言語のうち、最初に対応しているもの。どれにも対応していなければ英語。 */
export function getBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en';
  const locales = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const locale of locales) {
    const language = locale?.split('-')[0]?.toLowerCase();
    if (isLanguage(language)) return language;
  }
  return 'en';
}

/** 選んだ言語。まだ選んでいなければブラウザの言語に合わせる。 */
export function getLanguage(): Language {
  if (unsavedLanguage) return unsavedLanguage;
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    // 保存領域を読めなくてもブラウザの言語で表示する
  }
  return getBrowserLanguage();
}

/** html の lang と説明文を言語に合わせる。 */
export function applyLanguage(language: Language): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', translate(language, APP_DESCRIPTION));
}

export const APP_DESCRIPTION =
  'ブラウザだけで使える TODO 管理アプリ。データは端末の中にだけ保存されます。';

export function setLanguage(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
    unsavedLanguage = null;
  } catch {
    unsavedLanguage = language;
  }
  applyLanguage(language);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // 別のタブで言語を変えたらこのタブも合わせる
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

/**
 * 今の言語。言語が変わるとこのフックを使うコンポーネントが描き直される。
 * 画面の一番上 (Home) で使えば、その下は t() を呼ぶだけで切り替わる。
 * ビルド時に作る HTML には画面の中身が入らないので、サーバー側の値も同じ関数で求める。
 */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, getLanguage, getLanguage);
}

function translate(language: Language, source: string, values: readonly (string | number)[] = []) {
  // 同じ日本語でも英語では言い分ける語は「日本語|文脈」をキーにする。日本語では | より前だけを出す
  const japanese = source.split('|')[0] ?? source;
  const text = language === 'en' ? (english[source] ?? japanese) : japanese;
  return text.replace(/\{(\d+)\}/g, (match, index: string) =>
    String(values[Number(index)] ?? match),
  );
}

/** アプリの文言を今の言語にする。{0} などは values で置き換える (値は訳さない)。 */
export function t(source: string, values: readonly (string | number)[] = []): string {
  return translate(getLanguage(), source, values);
}
