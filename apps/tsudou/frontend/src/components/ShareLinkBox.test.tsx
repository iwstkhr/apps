import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QR_FADE_MS, QR_VISIBLE_MS } from './QrCodeDialog';
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
    expect(screen.queryByRole('button', { name: 'QR コード' })).not.toBeInTheDocument();
  });

  describe('QR コード', () => {
    const dialog = () => screen.queryByRole('dialog', { name: '共有用 URL の QR コード' });
    const openQr = () => {
      render(<ShareLinkBox label="共有用 URL" url={url} qrCode />);
      fireEvent.click(screen.getByRole('button', { name: 'QR コード' }));
    };
    /** 閉じる操作のあと、フェードアウトを待ってから消えることを確かめる */
    const expectClosedAfterFade = () => {
      expect(dialog()).toHaveAttribute('data-closing');
      act(() => vi.advanceTimersByTime(QR_FADE_MS - 1));
      expect(dialog()).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(1));
      expect(dialog()).not.toBeInTheDocument();
    };

    beforeEach(() => vi.useFakeTimers());

    it('ボタンを押すと QR コードと自動で閉じる旨の説明をモーダルで出す', () => {
      openQr();

      const shown = dialog();
      expect(shown).toBeInTheDocument();
      expect(shown).toHaveAttribute('open');
      expect(shown).not.toHaveAttribute('data-closing');
      expect(
        within(shown as HTMLElement).getByRole('img', { name: '共有用 URL の QR コード' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText('周りの人に読み取られないよう、10 秒後に自動で閉じます。'),
      ).toBeInTheDocument();
    });

    it('「閉じる」で閉じる', () => {
      openQr();

      fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
      expectClosedAfterFade();
    });

    it('Esc (cancel イベント) で閉じる', () => {
      openQr();

      fireEvent(dialog() as HTMLElement, new Event('cancel', { cancelable: true }));
      expectClosedAfterFade();
    });

    it('背景のクリックで閉じ、モーダルの中のクリックでは閉じない', () => {
      openQr();

      fireEvent.click(screen.getByText('周りの人に読み取られないよう、10 秒後に自動で閉じます。'));
      expect(dialog()).not.toHaveAttribute('data-closing');

      // 背景のクリックは dialog 要素そのものへのクリックとして届く
      fireEvent.click(dialog() as HTMLElement);
      expectClosedAfterFade();
    });

    it('一定時間経つと自動で閉じる', () => {
      openQr();

      act(() => vi.advanceTimersByTime(QR_VISIBLE_MS - 1));
      expect(dialog()).not.toHaveAttribute('data-closing');
      act(() => vi.advanceTimersByTime(1));
      expectClosedAfterFade();
    });
  });
});

// These assertions verify the Japanese interface explicitly.
beforeEach(() => localStorage.setItem('tsudou:language', 'ja'));
afterEach(() => vi.useRealTimers());
