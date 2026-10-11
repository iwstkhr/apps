// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TagInput } from '~/components/todo/tag-input';

const SUGGESTIONS = ['仕事', '家', '買い物'];

function Harness({ initial = [] as string[], onKeyDown = () => {} }) {
  const [tags, setTags] = useState(initial);
  const [draft, setDraft] = useState('');
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Escape が外へ届くかを確かめるため
    <div onKeyDown={onKeyDown}>
      <TagInput
        tags={tags}
        onTagsChange={setTags}
        draft={draft}
        onDraftChange={setDraft}
        suggestions={SUGGESTIONS}
      />
      <output aria-label="tags">{tags.join('|')}</output>
      <button type="button">other</button>
    </div>
  );
}

const input = () => screen.getByRole('combobox', { name: 'タグ' });
const tagsValue = () => screen.getByRole('status', { name: 'tags' }).textContent;
const optionNames = () => screen.queryAllByRole('option').map((option) => option.textContent);

describe('TagInput', () => {
  it('keeps suggesting the remaining tags after one is picked', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(input());
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    expect(optionNames()).toEqual(['#仕事', '#家', '#買い物']);

    await user.click(screen.getByRole('option', { name: '#仕事' }));
    expect(tagsValue()).toBe('仕事');
    expect(input()).toHaveFocus();
    expect(optionNames()).toEqual(['#家', '#買い物']);

    await user.click(screen.getByRole('option', { name: '#買い物' }));
    expect(tagsValue()).toBe('仕事|買い物');
    expect(optionNames()).toEqual(['#家']);
  });

  it('filters suggestions by the typed text and picks one with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(input(), '買');
    expect(optionNames()).toEqual(['#買い物']);
    await user.keyboard('{ArrowDown}');
    expect(input()).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: '#買い物' }).id,
    );
    await user.keyboard('{Enter}');
    expect(tagsValue()).toBe('買い物');
    expect(input()).toHaveValue('');
  });

  it('turns typed text into tags with Enter or commas', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(input(), '新規{Enter}');
    expect(tagsValue()).toBe('新規');

    await user.type(input(), 'a、b, c');
    expect(tagsValue()).toBe('新規|a|b');
    expect(input()).toHaveValue('c');

    // 離れても打ちかけの文字はそのまま残す (保存するときにフォームがタグに含める)
    await user.click(screen.getByRole('button', { name: 'other' }));
    expect(tagsValue()).toBe('新規|a|b');
    expect(input()).toHaveValue('c');
  });

  it('removes tags with the chip button and with Backspace in an empty field', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['仕事', '家']} />);

    await user.click(screen.getByRole('button', { name: 'タグ「仕事」を削除' }));
    expect(tagsValue()).toBe('家');
    expect(input()).toHaveFocus();

    await user.keyboard('{Backspace}');
    expect(tagsValue()).toBe('');
  });

  it('closes the suggestions with Escape without passing it on', async () => {
    const user = userEvent.setup();
    const onKeyDown = vi.fn();
    render(<Harness onKeyDown={onKeyDown} />);

    await user.click(input());
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(onKeyDown).not.toHaveBeenCalled();

    // 閉じた後の Escape は外へ届ける (編集フォームのキャンセル)
    await user.keyboard('{Escape}');
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it('waits for IME composition to end before splitting at a comma', () => {
    render(<Harness />);

    fireEvent.input(input(), { target: { value: 'しごと、' }, isComposing: true });
    expect(tagsValue()).toBe('');

    fireEvent.compositionEnd(input(), { target: { value: '仕事、' } });
    expect(tagsValue()).toBe('仕事');
    expect(input()).toHaveValue('');
  });
});
