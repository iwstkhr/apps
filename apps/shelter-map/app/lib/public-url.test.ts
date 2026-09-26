import { describe, expect, it } from 'vitest';
import { publicUrl } from '~/lib/public-url';

describe('publicUrl', () => {
  it('prefixes Vite BASE_URL and strips a leading slash', () => {
    expect(publicUrl('favicon.svg')).toBe(`${import.meta.env.BASE_URL}favicon.svg`);
    expect(publicUrl('/favicon.svg')).toBe(`${import.meta.env.BASE_URL}favicon.svg`);
  });
});
