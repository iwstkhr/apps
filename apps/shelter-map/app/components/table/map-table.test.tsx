// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MapTable } from '~/components/table/map-table';
import { createShelter } from '~/test/fixtures';

describe('MapTable', () => {
  it('shows the displayed shelter count and dataset source', () => {
    const shelters = [
      createShelter({ id: 'yokohama', name: '横浜避難所' }),
      createShelter({ id: 'kawasaki', name: '川崎避難所', address: '神奈川県川崎市' }),
    ];

    render(
      <div className="flex h-[32rem] flex-col">
        <MapTable shelters={shelters} />
      </div>,
    );

    expect(screen.getByText('2 件')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '国土地理院 指定緊急避難場所データ' })).toHaveAttribute(
      'href',
      'https://www.gsi.go.jp/bousaichiri/hinanbasho.html',
    );
  });
});
