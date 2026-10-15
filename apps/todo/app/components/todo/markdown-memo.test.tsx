// @vitest-environment happy-dom

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarkdownMemo } from './markdown-memo';

describe('MarkdownMemo', () => {
  it('renders Markdown and GFM while keeping plain text line breaks', () => {
    const { container } = render(
      <MarkdownMemo>{`## 手順

**重要** と *補足* と ~~削除~~

- 準備
- [x] 確認済み

| 項目 | 内容 |
| --- | --- |
| 期限 | 明日 |

\`code\`

\`\`\`js
const value = 1;
\`\`\`

一行目
二行目`}</MarkdownMemo>,
    );
    expect(screen.getByRole('heading', { name: '手順', level: 2 })).toBeInTheDocument();
    expect(container.querySelector('strong')).toHaveTextContent('重要');
    expect(container.querySelector('em')).toHaveTextContent('補足');
    expect(container.querySelector('del')).toHaveTextContent('削除');
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByRole('cell', { name: '明日' })).toBeInTheDocument();
    expect(container.querySelector('pre code')).toHaveTextContent('const value = 1;');
    expect(screen.getByText(/一行目/).textContent).toBe('一行目\n二行目');
  });

  it('does not execute HTML or unsafe links, and shows image references as links', () => {
    const { container } = render(
      <MarkdownMemo>{`<script>alert('test')</script>

[危険](javascript:alert%281%29)

[資料](https://example.com/docs)

![図](https://example.com/image.png)`}</MarkdownMemo>,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText('危険').getAttribute('href')).toBe('');
    expect(screen.getByRole('link', { name: '資料' })).toHaveAttribute(
      'href',
      'https://example.com/docs',
    );
    expect(screen.getByRole('link', { name: '資料' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    expect(screen.getByRole('link', { name: '図' })).toHaveAttribute(
      'href',
      'https://example.com/image.png',
    );
    expect(container.querySelector('img')).toBeNull();
  });

  it('checks and unchecks task boxes in the memo when it can be changed', async () => {
    const onChange = vi.fn();
    render(
      <MarkdownMemo onChange={onChange}>{`- [ ] 準備
  - [x] 入れ子
- 箇条書き

> 1. [ ] 引用`}</MarkdownMemo>,
    );
    const user = userEvent.setup();
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(3);
    for (const box of boxes) expect(box).toBeEnabled();

    await user.click(boxes[0]);
    expect(onChange).toHaveBeenLastCalledWith(`- [x] 準備
  - [x] 入れ子
- 箇条書き

> 1. [ ] 引用`);
    await user.click(boxes[1]);
    expect(onChange).toHaveBeenLastCalledWith(`- [ ] 準備
  - [ ] 入れ子
- 箇条書き

> 1. [ ] 引用`);
    await user.click(boxes[2]);
    expect(onChange).toHaveBeenLastCalledWith(`- [ ] 準備
  - [x] 入れ子
- 箇条書き

> 1. [x] 引用`);
  });

  describe('long memos', () => {
    afterEach(() => vi.restoreAllMocks());

    /** Pretend the rendered memo is this tall, against a clipped box of 128px. */
    function mockHeight(contentHeight: number) {
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(contentHeight);
      vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(128);
    }

    it('shows a short memo in full without a read more button', () => {
      mockHeight(100);
      render(<MarkdownMemo>短いメモ</MarkdownMemo>);
      expect(screen.getByText('短いメモ')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('cuts a long memo and expands and collapses it in place', async () => {
      mockHeight(400);
      render(<MarkdownMemo>長いメモ</MarkdownMemo>);
      const user = userEvent.setup();
      const button = screen.getByRole('button', { name: '続きを読む' });
      const clip = document.getElementById(button.getAttribute('aria-controls') ?? '');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(clip).toHaveClass('max-h-32', 'overflow-hidden');

      await user.click(button);
      expect(button).toHaveAccessibleName('折りたたむ');
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(clip).not.toHaveClass('max-h-32');

      await user.click(button);
      expect(button).toHaveAccessibleName('続きを読む');
      expect(clip).toHaveClass('max-h-32');
    });

    it('expands when focus moves into the cut-off part', () => {
      mockHeight(400);
      render(<MarkdownMemo>{'[資料](https://example.com/docs)'}</MarkdownMemo>);
      act(() => screen.getByRole('link', { name: '資料' }).focus());
      expect(screen.getByRole('button', { name: '折りたたむ' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
    });
  });
});
