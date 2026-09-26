import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ManageUrlBox, ShareUrlBox } from './EventUrlBoxes';

describe('ShareUrlBox / ManageUrlBox', () => {
  it('共有用 URL の文言と URL を出す', () => {
    render(<ShareUrlBox eventId="evt-1" />);

    expect(screen.getByText('共有用 URL')).toBeInTheDocument();
    expect(screen.getByText('参加予定者に送る URL です。')).toBeInTheDocument();
    expect(screen.getByText(`${window.location.origin}/e/evt-1`)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '開く' })).not.toBeInTheDocument();
  });

  it('管理用 URL はトークンをフラグメントに載せ、openable なら「開く」を出す', () => {
    render(<ManageUrlBox eventId="evt-1" manageToken="tok" openable />);

    const url = `${window.location.origin}/e/evt-1/manage#k=tok`;
    expect(screen.getByText('管理用 URL')).toBeInTheDocument();
    expect(
      screen.getByText('イベントの編集・締切・削除ができます。他の人には共有しないでください。'),
    ).toBeInTheDocument();
    expect(screen.getByText(url)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '開く' })).toHaveAttribute('href', url);
  });
});

// These assertions verify the Japanese interface explicitly.
beforeEach(() => localStorage.setItem('tsudou:language', 'ja'));
