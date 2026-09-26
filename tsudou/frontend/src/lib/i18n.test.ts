import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatDate, formatFee } from './format';
import { applyLanguage, getLanguage, LANGUAGE_KEY, setLanguage, t, useLanguage } from './i18n';

beforeEach(() => {
  setLanguage('ja');
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  setLanguage('ja');
  localStorage.clear();
});

describe('language preferences', () => {
  it('defaults to Japanese and ignores unsupported stored values', () => {
    expect(getLanguage()).toBe('ja');
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    expect(getLanguage()).toBe('ja');
  });

  it('restores English and updates document language and metadata', () => {
    localStorage.setItem(LANGUAGE_KEY, 'en');
    document.head.innerHTML = '<meta name="description" content="" />';
    applyLanguage(getLanguage());
    expect(getLanguage()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe('Tsudou | Event scheduling');
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Schedule events with Tsudou without signing in.',
    );
  });

  it('keeps switching functional when browser storage cannot be read or written', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    setLanguage('en');
    expect(getLanguage()).toBe('en');
    expect(t('使い方')).toBe('User guide');
    setLanguage('ja');
    expect(getLanguage()).toBe('ja');
  });

  it('keeps an unsaved choice when only writes are blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    setLanguage('en');
    expect(getLanguage()).toBe('en');
  });

  it('synchronizes mounted screens with language changes in another tab', () => {
    const { result } = renderHook(useLanguage);
    expect(result.current).toBe('ja');
    act(() => {
      localStorage.setItem(LANGUAGE_KEY, 'en');
      window.dispatchEvent(new StorageEvent('storage', { key: LANGUAGE_KEY, newValue: 'en' }));
    });
    expect(result.current).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    act(() => {
      localStorage.clear();
      window.dispatchEvent(new StorageEvent('storage', { key: null }));
    });
    expect(result.current).toBe('ja');
  });
});

describe('localized text and formatting', () => {
  it('interpolates names without interpreting them as translation keys', () => {
    setLanguage('en');
    expect(t('「{0}」の回答を削除します。よろしいですか?', ['イベント名'])).toBe(
      'Delete the response from “イベント名”?',
    );
  });

  it('translates field validation and server errors with their details', () => {
    setLanguage('en');
    expect(t('イベント名を入力してください')).toBe('Enter Event title.');
    expect(t('メモは2000文字以内で入力してください')).toBe(
      'Memo must be 2000 characters or fewer.',
    );
    expect(t('日時の候補は30件までです')).toBe('Add no more than 30 candidate dates.');
    expect(t('参加費は 1,000,000 円以下で入力してください')).toBe(
      'The fee must be 1,000,000 yen or less.',
    );
    expect(t('この名前はすでに回答済みです')).toBe('This name has already responded.');
    expect(t('過去の日時は候補にできません')).toBe('Candidate dates cannot be in the past.');
  });

  it('localizes weekday and fee labels while keeping yen and local time', () => {
    const iso = new Date(2026, 9, 3, 19).toISOString();
    setLanguage('en');
    expect(formatDate(iso)).toBe('10/3(Sat)');
    expect(formatFee(null)).toBe('Not set');
    expect(formatFee(0)).toBe('Free');
    expect(formatFee(3000)).toBe('¥3,000');
    setLanguage('ja');
    expect(formatDate(iso)).toBe('10/3(土)');
    expect(formatFee(0)).toBe('無料');
  });
});
