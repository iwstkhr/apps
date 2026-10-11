// @vitest-environment happy-dom

import { fireEvent, render, screen, within } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ShelterTableRows } from '~/components/table/shelter-table-rows';
import { createShelter } from '~/test/fixtures';
import { shelterTypeKeys } from '~/types/shelter-type';

const virtualizerOptions = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (options: { count: number; scrollMargin?: number }) => {
    virtualizerOptions.current = options;
    const { count, scrollMargin = 0 } = options;
    return {
      getTotalSize: () => count * 56,
      getVirtualItems: () => (count > 0 ? [{ index: 0, start: scrollMargin }] : []),
      measureElement: vi.fn(),
      scrollToIndex: vi.fn(),
    };
  },
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

  it('renders a card with the designated disaster types in the card layout', () => {
    render(
      <ShelterTableRows
        shelters={[createShelter()]}
        scrollContainerRef={createRef<HTMLDivElement>()}
        layout="card"
      />,
    );

    const cells = within(screen.getByRole('row')).getAllByRole('cell');
    expect(cells).toHaveLength(3);
    expect(cells[2]).toHaveTextContent('洪水地震');
  });

  it('offsets scrolling by the sticky header height', () => {
    render(
      <ShelterTableRows
        shelters={[createShelter()]}
        scrollContainerRef={createRef<HTMLDivElement>()}
        stickyHeaderHeight={48}
      />,
    );

    expect(virtualizerOptions.current).toMatchObject({ scrollMargin: 48, scrollPaddingStart: 48 });
    // Item starts include the margin, but the rows are positioned inside the row group below it
    expect(screen.getByRole('row')).toHaveStyle({ transform: 'translateY(0px)' });
  });
});
