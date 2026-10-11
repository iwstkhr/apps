import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { setLanguage } from '~/lib/i18n';
import { createEmptyDb } from '~/test/indexed-db';

// Existing tests assume the Japanese UI. Following English or the browser language
// is set up and checked in each i18n test
beforeEach(() => setLanguage('ja'));
// Start empty without samples. The tests that check samples add them
beforeEach(createEmptyDb);
afterEach(cleanup);
