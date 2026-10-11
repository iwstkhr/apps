import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { setLanguage } from '~/lib/i18n';
import { createEmptyDb } from '~/test/indexed-db';

// 既存のテストは日本語の画面を前提にしている。英語やブラウザの言語に合わせる動きは
// i18n のテストでそれぞれ設定して確かめる
beforeEach(() => setLanguage('ja'));
// サンプルを入れずに空の状態から始める。サンプルはそれを確かめるテストで入れる
beforeEach(createEmptyDb);
afterEach(cleanup);
