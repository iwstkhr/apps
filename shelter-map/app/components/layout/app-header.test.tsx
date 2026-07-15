// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppHeader } from '~/components/layout/app-header';

describe('AppHeader', () => {
  it('renders the app title and GitHub link', () => {
    render(<AppHeader />);

    expect(screen.getByRole('heading', { name: '指定緊急避難場所マップ' })).toBeInTheDocument();
    expect(screen.getByRole('presentation', { hidden: true })).toHaveAttribute(
      'src',
      `${import.meta.env.BASE_URL}favicon.svg`,
    );
    expect(screen.getByRole('link', { name: 'GitHub リポジトリを開く' })).toHaveAttribute(
      'href',
      'https://github.com/iwstkhr/shelter-map',
    );
  });
});
