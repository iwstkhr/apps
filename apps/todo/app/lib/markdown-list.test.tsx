// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { continueList, handleListEnter, type TextEdit, toggleTask } from '~/lib/markdown-list';

/** Applies the edit for Enter at the | in text, and shows the cursor after it as | */
function pressEnter(text: string) {
  const cursor = text.indexOf('|');
  const value = text.slice(0, cursor) + text.slice(cursor + 1);
  const edit: TextEdit | null = continueList(value, cursor);
  if (!edit) return null;
  return `${value.slice(0, edit.start)}${edit.text}|${value.slice(edit.end)}`;
}

describe('continueList', () => {
  it('continues bullets with the same mark and indent', () => {
    expect(pressEnter('- 牛乳|')).toBe('- 牛乳\n- |');
    expect(pressEnter('* 牛乳|')).toBe('* 牛乳\n* |');
    expect(pressEnter('メモ\n  + 牛乳|\n次')).toBe('メモ\n  + 牛乳\n  + |\n次');
  });

  it('continues numbered lists with the next number', () => {
    expect(pressEnter('1. 準備|')).toBe('1. 準備\n2. |');
    expect(pressEnter('9) 準備|')).toBe('9) 準備\n10) |');
  });

  it('continues task lists with an unchecked box', () => {
    expect(pressEnter('- [x] 確認済み|')).toBe('- [x] 確認済み\n- [ ] |');
    expect(pressEnter('1. [ ] 準備|')).toBe('1. [ ] 準備\n2. [ ] |');
  });

  it('moves the text after the cursor to the new item', () => {
    expect(pressEnter('- 牛乳|と卵')).toBe('- 牛乳\n- |と卵');
  });

  it('removes the bullet of an empty item to end the list', () => {
    expect(pressEnter('- 牛乳\n- |')).toBe('- 牛乳\n|');
    expect(pressEnter('- [ ] 準備\n- [ ] |')).toBe('- [ ] 準備\n|');
    expect(pressEnter('- [ ] 準備\n- [ ]|')).toBe('- [ ] 準備\n|');
    expect(pressEnter('1. 準備\n  2. |\n次')).toBe('1. 準備\n|\n次');
  });

  it('leaves Enter as is outside list items and inside the bullet', () => {
    expect(pressEnter('ただの文|')).toBeNull();
    expect(pressEnter('-牛乳|')).toBeNull();
    expect(pressEnter('|- 牛乳')).toBeNull();
    expect(pressEnter('-| 牛乳')).toBeNull();
  });
});

describe('toggleTask', () => {
  const memo = '手順\n\n- [ ] 準備\n- [x] 確認\n1. [X] 番号';

  it('checks and unchecks the task item starting at the offset', () => {
    expect(toggleTask(memo, memo.indexOf('- [ ]'))).toBe(
      '手順\n\n- [x] 準備\n- [x] 確認\n1. [X] 番号',
    );
    expect(toggleTask(memo, memo.indexOf('- [x]'))).toBe(
      '手順\n\n- [ ] 準備\n- [ ] 確認\n1. [X] 番号',
    );
    expect(toggleTask(memo, memo.indexOf('1.'))).toBe(
      '手順\n\n- [ ] 準備\n- [x] 確認\n1. [ ] 番号',
    );
  });

  it('leaves the memo unchanged where no task box starts', () => {
    expect(toggleTask(memo, 0)).toBe(memo);
  });
});

describe('handleListEnter', () => {
  function Memo() {
    const [value, setValue] = useState('');
    return (
      <textarea
        aria-label="メモ"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleListEnter}
      />
    );
  }

  it('continues and ends lists while typing, and leaves Shift+Enter as a plain line', async () => {
    render(<Memo />);
    const user = userEvent.setup();
    const memo = screen.getByRole('textbox', { name: 'メモ' });
    await user.type(memo, '- [[ ] 牛乳{Enter}卵{Enter}{Enter}以上{Shift>}{Enter}{/Shift}- 続き');
    expect(memo).toHaveValue('- [ ] 牛乳\n- [ ] 卵\n以上\n- 続き');
  });
});
