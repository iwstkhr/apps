import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Alert } from '../components/ui';
import { LANGUAGE_KEY, setLanguage } from '../lib/i18n';
import { createQueryClient } from '../lib/query-client';
import { Guide } from './guide';
import { Home } from './home';
import { Root } from './root';

beforeEach(() => {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US']);
  localStorage.clear();
  setLanguage('ja');
});
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  setLanguage('ja');
});

function renderPage(page: 'home' | 'guide' = 'home') {
  const router = createMemoryRouter(
    [
      {
        element: <Root />,
        children: [
          { path: '/', element: <Home /> },
          { path: '/guide', element: <Guide /> },
        ],
      },
    ],
    { initialEntries: [page === 'home' ? '/' : '/guide'] },
  );
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('language switching', () => {
  it('shows Japanese on a first visit with a Japanese browser preference', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['ja-JP', 'en-US']);
    localStorage.clear();
    renderPage();
    expect(screen.getByLabelText(/^イベント名/)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '言語' })).toHaveValue('ja');
    expect(localStorage.getItem(LANGUAGE_KEY)).toBeNull();
  });

  it('shows English on a first visit without a saved language', () => {
    localStorage.clear();
    renderPage();
    expect(screen.getByRole('heading', { name: 'Create an event' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('en');
  });

  it('switches the whole screen without losing an event draft or existing validation errors', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/^イベント名/), '日本語のイベント');
    await user.type(screen.getByLabelText('メモ (任意)'), 'Keep this draft');
    await user.type(screen.getByLabelText('参加費 (任意)'), '-1');
    await user.tab();
    expect(screen.getByRole('alert')).toHaveTextContent('参加費は0以上の整数で入力してください');
    const candidate = screen.getByLabelText('候補 1 の日時') as HTMLInputElement;
    const date = candidate.value;
    await user.selectOptions(screen.getByRole('combobox', { name: '言語' }), 'en');
    expect(screen.getByRole('heading', { name: 'Create an event' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Event title/)).toHaveValue('日本語のイベント');
    expect(screen.getByLabelText('Memo (optional)')).toHaveValue('Keep this draft');
    expect(screen.getByLabelText('Date/time for candidate 1')).toHaveValue(date);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a nonnegative whole number for the fee.',
    );
    expect(screen.getByRole('button', { name: 'Dark theme' })).toBeInTheDocument();
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'ja');
    expect(screen.getByLabelText(/^イベント名/)).toHaveValue('日本語のイベント');
    expect(screen.getByRole('alert')).toHaveTextContent('参加費は0以上の整数で入力してください');
  });

  it('restores English and translates the guide including every image description', () => {
    localStorage.setItem(LANGUAGE_KEY, 'en');
    renderPage('guide');
    expect(screen.getByRole('heading', { level: 1, name: 'User guide' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Table of contents' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Guide for hosts' })).toHaveAttribute('id', 'host');
    for (const image of screen.getAllByRole('img')) {
      if (image.getAttribute('alt'))
        expect(image.getAttribute('alt')).not.toMatch(/[ぁ-んァ-ン一-龯]/);
    }
    expect(screen.getByText(/Screenshots use sample data/)).toBeInTheDocument();
  });

  it('updates an already displayed server error when changing language', () => {
    render(<Alert variant="error">この名前はすでに回答済みです</Alert>);
    act(() => setLanguage('en'));
    expect(screen.getByRole('alert')).toHaveTextContent('This name has already responded.');
    act(() => setLanguage('ja'));
    expect(screen.getByRole('alert')).toHaveTextContent('この名前はすでに回答済みです');
  });
});
