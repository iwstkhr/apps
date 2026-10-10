import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { setLanguage } from '~/lib/i18n';

// 既存のテストは日本語の画面を前提にしている。英語やブラウザの言語に合わせる動きは
// i18n のテストでそれぞれ設定して確かめる
beforeEach(() => setLanguage('ja'));
afterEach(cleanup);
