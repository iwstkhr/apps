// @vitest-environment happy-dom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  APP_DESCRIPTION,
  getBrowserLanguage,
  getLanguage,
  LANGUAGE_KEY,
  setLanguage,
  t,
  useLanguage,
} from '~/lib/i18n';
import { APPEARANCES, THEMES } from '~/lib/themes';
import { STATUS_FILTER_OPTIONS } from '~/lib/todo-filters';
import { english } from '~/lib/translations';
import { PRIORITY_LABELS, STATUS_LABELS } from '~/types/todo';

function browserLanguages(languages: string[], language = languages[0] ?? '') {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages);
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(language);
}

beforeEach(() => {
  // setup.ts が日本語にしているので、ここでは保存なしの状態から始める
  localStorage.removeItem(LANGUAGE_KEY);
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('browser language', () => {
  it.each([
    [['ja-JP', 'en-US'], 'ja'],
    [['en-GB', 'ja'], 'en'],
    [['fr-FR', 'ja-JP'], 'ja'],
    [['fr-FR', 'de-DE'], 'en'],
  ] as const)('picks the first supported language from %j', (languages, expected) => {
    browserLanguages([...languages]);
    expect(getBrowserLanguage()).toBe(expected);
  });

  it('uses navigator.language when the preferred list is empty', () => {
    browserLanguages([], 'ja');
    expect(getBrowserLanguage()).toBe('ja');
  });

  it('follows the browser until a language is chosen', () => {
    browserLanguages(['ja-JP']);
    expect(getLanguage()).toBe('ja');
    browserLanguages(['en-US']);
    expect(getLanguage()).toBe('en');
  });
});

describe('choosing a language', () => {
  it('saves the choice, which then wins over the browser language', () => {
    browserLanguages(['ja-JP']);
    setLanguage('en');
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('en');
    expect(getLanguage()).toBe('en');
  });

  it('ignores an invalid saved value', () => {
    browserLanguages(['ja-JP']);
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    expect(getLanguage()).toBe('ja');
  });

  it('updates the html lang and the description', () => {
    const meta = document.createElement('meta');
    meta.name = 'description';
    document.head.append(meta);

    setLanguage('en');
    expect(document.documentElement.lang).toBe('en');
    expect(meta.content).toBe(english[APP_DESCRIPTION]);
    setLanguage('ja');
    expect(document.documentElement.lang).toBe('ja');
    expect(meta.content).toBe(APP_DESCRIPTION);
    meta.remove();
  });

  it('keeps the choice for this page when storage is unavailable', () => {
    browserLanguages(['ja-JP']);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    setLanguage('en');
    expect(getLanguage()).toBe('en');
    vi.restoreAllMocks();
    setLanguage('ja');
  });

  it('re-renders components that use the language', () => {
    setLanguage('ja');
    const { result } = renderHook(() => useLanguage());
    expect(result.current).toBe('ja');
    act(() => setLanguage('en'));
    expect(result.current).toBe('en');
  });
});

describe('t', () => {
  it('translates and fills in values without translating them', () => {
    setLanguage('en');
    expect(t('「{0}」を削除しますか？', ['会議'])).toBe('Delete "会議"?');
    expect(t('TODO {0} 件とフォルダ {1} 件をインポートしました。', [3, 1])).toBe(
      'Imported 3 todos and 1 folders.',
    );
    setLanguage('ja');
    expect(t('「{0}」を削除しますか？', ['会議'])).toBe('「会議」を削除しますか？');
  });

  it('shows only the Japanese part of a key with context', () => {
    setLanguage('ja');
    expect(t('フォルダ|項目')).toBe('フォルダ');
    setLanguage('en');
    expect(t('フォルダ|項目')).toBe('Folder');
    expect(t('フォルダ')).toBe('Folders');
  });

  it('falls back to Japanese for text without a translation', () => {
    setLanguage('en');
    expect(t('訳のない文言')).toBe('訳のない文言');
  });
});

describe('translations', () => {
  // ソースの t('…') と、画面に出すラベルの定数がすべて訳されているか
  const sources = import.meta.glob(['../**/*.{ts,tsx}', '!../**/*.test.{ts,tsx}', '!../test/**'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  function keysInSource(): Set<string> {
    const keys = new Set<string>();
    for (const code of Object.values(sources)) {
      for (const match of code.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) keys.add(match[1]);
      // t(条件 ? 'a' : 'b') の形
      for (const match of code.matchAll(/\bt\([^'()]*\?\s*'([^']*)'\s*:\s*'([^']*)'/g)) {
        keys.add(match[1]);
        keys.add(match[2]);
      }
    }
    return keys;
  }

  it('finds the translated text in the source', () => {
    expect(keysInSource().size).toBeGreaterThan(100);
  });

  it('has an English translation for every text passed to t()', () => {
    const missing = [...keysInSource()].filter((key) => !(key in english));
    expect(missing).toEqual([]);
  });

  it('has an English translation for every label constant', () => {
    const labels = [
      ...Object.values(PRIORITY_LABELS),
      ...Object.values(STATUS_LABELS),
      ...STATUS_FILTER_OPTIONS.map((option) => option.label),
      ...THEMES.map((theme) => theme.label),
      ...APPEARANCES.map((appearance) => appearance.label),
    ];
    expect(labels.filter((label) => !(label in english))).toEqual([]);
  });

  it('has an English translation for every label literal in the source', () => {
    const labels = Object.entries(sources)
      // 言語名 (日本語 / English) はどの言語でもそのまま出す
      .filter(([path]) => !path.endsWith('/i18n.ts'))
      .flatMap(([, code]) => [...code.matchAll(/\blabel: '([^']+)'/g)].map((m) => m[1]));
    expect(labels.length).toBeGreaterThan(10);
    expect(labels.filter((label) => !(label in english))).toEqual([]);
  });

  it('keeps the same placeholders in English', () => {
    const placeholders = (text: string) => [...text.matchAll(/\{\d+\}/g)].map((m) => m[0]).sort();
    const mismatched = Object.entries(english).filter(
      ([japanese, translated]) => placeholders(japanese).join() !== placeholders(translated).join(),
    );
    expect(mismatched).toEqual([]);
  });
});
