// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';
import { clearSettings, isResetting, setResetting } from '~/lib/app-reset';

afterEach(() => {
  setResetting(false);
  localStorage.clear();
});

describe('app-reset', () => {
  it('deletes only this app’s settings', () => {
    localStorage.setItem('todo:language', 'en');
    localStorage.setItem('todo:theme', 'ocean');
    localStorage.setItem('todo:view', '{}');
    localStorage.setItem('other', 'kept');
    clearSettings();
    expect(Object.keys(localStorage)).toEqual(['other']);
  });

  it('remembers whether a reset is in progress', () => {
    expect(isResetting()).toBe(false);
    setResetting(true);
    expect(isResetting()).toBe(true);
  });
});
