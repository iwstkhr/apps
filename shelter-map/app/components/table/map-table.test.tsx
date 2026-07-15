// @vitest-environment happy-dom

import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MapTable } from '~/components/table/map-table';
import { createShelter } from '~/test/fixtures';
import { renderWithShelterMap } from '~/test/render-with-shelter-map';
import { emptyShelterColumnFilters } from '~/types/shelter-filters';

describe('MapTable', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('shows the displayed shelter count and viewport notice', () => {
    const shelters = [
      createShelter({ name: '横浜避難所' }),
      createShelter({ name: '川崎避難所', address: '神奈川県川崎市' }),
    ];

    const { container } = renderWithShelterMap(
      <div className="flex h-[32rem] flex-col">
        <MapTable />
      </div>,
      { displayedShelters: shelters },
    );

    expect(
      screen.getByText('一覧には地図の表示領域内の避難所のみを表示しています。'),
    ).toBeInTheDocument();
    expect(screen.getByText('2 件')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '国土地理院 指定緊急避難場所データ' })).toHaveAttribute(
      'href',
      'https://www.gsi.go.jp/bousaichiri/hinanbasho.html',
    );

    const metaBar = screen.getByText(
      '一覧には地図の表示領域内の避難所のみを表示しています。',
    ).parentElement;
    expect(metaBar?.className).toContain('flex-col');
    expect(metaBar?.className).toContain('sm:flex-row');
    expect(container.querySelector('.min-w-0')).not.toBeNull();
  });

  it('debounces column filter changes before updating the map', () => {
    const { container, contextValue } = renderWithShelterMap(
      <div className="flex h-[32rem] flex-col">
        <MapTable />
      </div>,
    );
    const table = within(container).getByRole('table');

    fireEvent.click(within(table).getByRole('button', { name: '名前のフィルター' }));

    const filterInput = within(table).getByPlaceholderText('名前で絞り込み');
    fireEvent.change(filterInput, { target: { value: '横浜' } });

    expect(contextValue.updateColumnFilters).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);

    expect(contextValue.updateColumnFilters).toHaveBeenCalledOnce();
    expect(contextValue.updateColumnFilters).toHaveBeenCalledWith({
      ...emptyShelterColumnFilters,
      name: '横浜',
    });
  });
});
