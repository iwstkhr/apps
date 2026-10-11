// @vitest-environment happy-dom

import { fireEvent, render, screen, within } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ShelterTableRows } from '~/components/table/shelter-table-rows';
import { createShelter } from '~/test/fixtures';
import { shelterTypeKeys } from '~/types/shelter-type';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 56,
    getVirtualItems: () => (count > 0 ? [{ index: 0, start: 0 }] : []),
    measureElement: vi.fn(),
    scrollToIndex: vi.fn(),
  }),
}));

describe('ShelterTableRows', () => {
  it('renders virtualized shelter cells directly from the domain model', () => {
    render(
      <ShelterTableRows
        shelters={[createShelter()]}
        scrollContainerRef={createRef<HTMLDivElement>()}
      />,
    );

    const row = screen.getByRole('row');
    expect(within(row).getByText('テスト避難所')).toBeInTheDocument();
    expect(within(row).getByText('神奈川県横浜市')).toBeInTheDocument();
    expect(within(row).getAllByRole('cell')).toHaveLength(2 + shelterTypeKeys.length);
    expect(screen.getByRole('rowgroup')).toHaveStyle({ height: '56px' });
  });

  it('selects a shelter by click or keyboard and marks the selected row', () => {
    const shelter = createShelter();
    const onSelect = vi.fn();
    const { rerender } = render(
      <ShelterTableRows
        shelters={[shelter]}
        scrollContainerRef={createRef<HTMLDivElement>()}
        onSelect={onSelect}
      />,
    );

    const row = screen.getByRole('row');
    expect(row).not.toHaveAttribute('aria-current');
    fireEvent.click(row);
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith(shelter);

    rerender(
      <ShelterTableRows
        shelters={[shelter]}
        scrollContainerRef={createRef<HTMLDivElement>()}
        selectedShelterId={shelter.id}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole('row')).toHaveAttribute('aria-current', 'true');
  });
});
