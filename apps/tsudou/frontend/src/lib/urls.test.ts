import { describe, expect, it } from 'vitest';
import { answerEditUrl, managePath, readAnswerKeyFromHash, readTokenFromHash } from './urls';

describe('answerEditUrl / readAnswerKeyFromHash', () => {
  it('フラグメントに載せた回答 ID と編集キーを読み戻せる', () => {
    const key = { answerId: 'ans-1', editToken: 'tok_+/=' };
    const url = new URL(answerEditUrl('evt-1', key));

    expect(url.pathname).toBe('/e/evt-1');
    expect(url.search).toBe('');
    expect(readAnswerKeyFromHash(url.hash)).toEqual(key);
  });

  it('片方でも欠けていれば null', () => {
    expect(readAnswerKeyFromHash('')).toBeNull();
    expect(readAnswerKeyFromHash('#a=ans-1')).toBeNull();
    expect(readAnswerKeyFromHash('#k=tok')).toBeNull();
    expect(readAnswerKeyFromHash('#a=%20&k=tok')).toBeNull();
  });
});

describe('managePath', () => {
  it('新しいタブでも管理できるよう、トークンをフラグメントに載せる', () => {
    const path = managePath('evt-1', 'tok_+/=');
    const url = new URL(path, 'https://example.com');

    expect(url.pathname).toBe('/e/evt-1/manage');
    expect(url.search).toBe('');
    expect(readTokenFromHash(url.hash)).toBe('tok_+/=');
  });
});
