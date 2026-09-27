// @vitest-environment happy-dom

import { render, screen, within } from '@testing-library/react';
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
});
