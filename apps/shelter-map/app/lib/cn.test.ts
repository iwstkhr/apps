import { describe, expect, it } from 'vitest';
import { cn } from '~/lib/cn';

describe('cn', () => {
  it('joins class names with spaces', () => {
    expect(cn('px-3', 'py-2')).toBe('px-3 py-2');
  });

  it('skips falsy entries', () => {
    expect(cn('px-3', false, null, undefined, '', 'text-center')).toBe('px-3 text-center');
  });

  it('returns an empty string when nothing is set', () => {
    expect(cn(false, undefined)).toBe('');
  });
});
