import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ShareLinkBox } from './ShareLinkBox';

const url = 'https://example.com/e/evt-1/manage#k=token';

describe('ShareLinkBox', () => {
  it('openable のときは URL を新しいタブで開くリンクを出す', () => {
    render(<ShareLinkBox label="管理用 URL" url={url} openable />);

    const open = screen.getByRole('link', { name: '開く' });
    expect(open).toHaveAttribute('href', url);
    expect(open).toHaveAttribute('target', '_blank');
    expect(open).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('既定では「開く」を出さない', () => {
    render(<ShareLinkBox label="共有用 URL" url={url} />);

    expect(screen.queryByRole('link', { name: '開く' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'コピー' })).toBeInTheDocument();
  });
});

// These assertions verify the Japanese interface explicitly.
beforeEach(() => localStorage.setItem('tsudou:language', 'ja'));
