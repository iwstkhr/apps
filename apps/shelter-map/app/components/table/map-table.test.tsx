// @vitest-environment happy-dom

import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MapTable } from '~/components/table/map-table';
import { createShelter } from '~/test/fixtures';
import { emptyShelterColumnFilters } from '~/types/shelter-filters';

describe('MapTable', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the displayed shelter count and dataset source', () => {
    const shelters = [
      createShelter({ id: 'yokohama', name: '横浜避難所' }),
      createShelter({ id: 'kawasaki', name: '川崎避難所', address: '神奈川県川崎市' }),
    ];

    render(
      <div className="flex h-[32rem] flex-col">
        <MapTable shelters={shelters} onFiltersChange={vi.fn()} />
      </div>,
    );

    expect(screen.getByText('2 件')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '国土地理院 指定緊急避難場所データ' })).toHaveAttribute(
      'href',
      'https://www.gsi.go.jp/bousaichiri/hinanbasho.html',
    );
  });

  it('debounces column filter changes before updating the map', () => {
    const onFiltersChange = vi.fn();
    const { container } = render(
      <div className="flex h-[32rem] flex-col">
        <MapTable shelters={[createShelter()]} onFiltersChange={onFiltersChange} />
      </div>,
    );
    const table = within(container).getByRole('table');

    fireEvent.click(within(table).getByRole('button', { name: '名前のフィルター' }));

    const filterInput = within(table).getByPlaceholderText('名前で絞り込み');
    fireEvent.change(filterInput, { target: { value: '横浜' } });

    expect(onFiltersChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);

    expect(onFiltersChange).toHaveBeenCalledOnce();
    expect(onFiltersChange).toHaveBeenCalledWith({
      ...emptyShelterColumnFilters,
      name: '横浜',
    });
  });
});
