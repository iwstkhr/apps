// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
});
