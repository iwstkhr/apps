// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ColumnHeaderWithFilter } from '~/components/table/column-header-filter';
import { emptyShelterColumnFilters, type ShelterFilterColumnId } from '~/types/shelter-filters';

function renderHeader({
  columnId = 'name',
  label = '名前',
  isOpen = false,
  filters = emptyShelterColumnFilters,
  className,
}: {
  columnId?: ShelterFilterColumnId;
  label?: string;
  isOpen?: boolean;
  filters?: typeof emptyShelterColumnFilters;
  className?: string;
} = {}) {
  const onToggle = vi.fn();
  const onFiltersChange = vi.fn();

  render(
    <ColumnHeaderWithFilter
      columnId={columnId}
      label={label}
      className={className}
      isOpen={isOpen}
      filters={filters}
      onToggle={onToggle}
      onFiltersChange={onFiltersChange}
    />,
  );

  return { onToggle, onFiltersChange };
}

describe('ColumnHeaderWithFilter', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the label and toggles the filter popover', () => {
    const { onToggle } = renderHeader({ className: 'sticky left-0' });

    const header = screen.getByRole('columnheader');
    expect(header).toHaveTextContent('名前');
    expect(header).toHaveClass('sticky', 'left-0');

    const toggle = screen.getByRole('button', { name: '名前のフィルター' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByPlaceholderText('名前で絞り込み')).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('edits the text filter for name and address columns', () => {
    const { onFiltersChange } = renderHeader({ columnId: 'address', label: '住所', isOpen: true });

    fireEvent.change(screen.getByPlaceholderText('住所で絞り込み'), {
      target: { value: '横浜' },
    });

    expect(onFiltersChange).toHaveBeenCalledWith({ ...emptyShelterColumnFilters, address: '横浜' });
  });

  it('edits the disaster type filter for shelter type columns', () => {
    const { onFiltersChange } = renderHeader({ columnId: 'flood', label: '洪水', isOpen: true });

    fireEvent.change(screen.getByRole('combobox', { name: '災害種別で絞り込み' }), {
      target: { value: 'yes' },
    });

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...emptyShelterColumnFilters,
      types: { ...emptyShelterColumnFilters.types, flood: 'yes' },
    });
  });

  it('highlights the toggle when the column filter is active', () => {
    renderHeader({ filters: { ...emptyShelterColumnFilters, name: 'テスト' } });

    expect(screen.getByRole('button', { name: '名前のフィルター' })).toHaveClass('bg-blue-100');
  });
});
