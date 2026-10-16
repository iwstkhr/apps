import { describe, expect, it } from 'vitest';
import { highlightCode, resolveLanguage } from '~/lib/code-highlight';

describe('resolveLanguage', () => {
  it('accepts supported names and common aliases case-insensitively', () => {
    expect(resolveLanguage('typescript')).toBe('typescript');
    expect(resolveLanguage('TS')).toBe('typescript');
    expect(resolveLanguage('bash')).toBe('shellscript');
    expect(resolveLanguage('yml')).toBe('yaml');
  });

  it('returns null for unsupported languages', () => {
    expect(resolveLanguage('brainfuck')).toBeNull();
    expect(resolveLanguage('constructor')).toBeNull();
  });
});

describe('highlightCode', () => {
  it('splits code into lines of tokens with light and dark colors', async () => {
    const tokens = await highlightCode('const a = 1;\nlet b = 2;', 'ts');
    expect(tokens).toHaveLength(2);
    expect(tokens?.[0].map((token) => token.content).join('')).toBe('const a = 1;');
    expect(tokens?.[0][0]).toMatchObject({
      content: 'const',
      htmlStyle: { '--shiki-light': expect.any(String), '--shiki-dark': expect.any(String) },
    });
  });

  it('returns null for an unsupported language', async () => {
    await expect(highlightCode('x', 'unknown')).resolves.toBeNull();
  });
});
