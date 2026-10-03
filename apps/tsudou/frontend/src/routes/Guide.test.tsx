import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { Guide } from './Guide';

function renderGuide() {
  const router = createMemoryRouter([{ path: '/guide', element: <Guide /> }], {
    initialEntries: ['/guide'],
  });
  render(<RouterProvider router={router} />);
}

describe('Guide', () => {
  it('主催者と参加者の使い方を、目次から飛べる見出しで分けて表示する', () => {
    renderGuide();

    const host = screen.getByRole('heading', {
      level: 2,
      name: 'イベント管理者（主催者）の使い方',
    });
    const guest = screen.getByRole('heading', { level: 2, name: 'イベント参加者の使い方' });
    expect(host).toHaveAttribute('id', 'host');
    expect(guest).toHaveAttribute('id', 'guest');

    const toc = screen.getByRole('navigation', { name: '目次' });
    expect(toc.querySelector('a[href="#host"]')).not.toBeNull();
    expect(toc.querySelector('a[href="#guest"]')).not.toBeNull();
  });

  it('画面キャプチャにはすべて代替テキストと寸法が付いている', () => {
    renderGuide();

    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);
    for (const img of images) {
      expect(img.getAttribute('alt')?.trim()).toBeTruthy();
      expect(img).toHaveAttribute('width');
      expect(img).toHaveAttribute('height');
    }
  });

  it.each(['ja', 'en'] as const)('表示言語 %s の画面キャプチャを表示する', (language) => {
    localStorage.setItem('tsudou:language', language);
    renderGuide();

    for (const img of screen.getAllByRole('img')) {
      expect(img.getAttribute('src')).toContain(`/assets/guide/${language}/`);
    }
  });
});

// These assertions verify the Japanese interface explicitly.
beforeEach(() => localStorage.setItem('tsudou:language', 'ja'));
