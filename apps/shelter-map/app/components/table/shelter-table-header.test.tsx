// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShelterTableHeader } from '~/components/table/shelter-table-header';
import { emptyShelterColumnFilters } from '~/types/shelter-filters';
import { shelterTypeKeys } from '~/types/shelter-type';

describe('ShelterTableHeader', () => {
  afterEach(cleanup);

  it('renders text and disaster type columns', () => {
    render(
      <ShelterTableHeader
        filters={emptyShelterColumnFilters}
        openFilterColumn={null}
        onToggleFilter={() => {}}
        onFiltersChange={() => {}}
      />,
    );

    expect(screen.getAllByRole('columnheader')).toHaveLength(2 + shelterTypeKeys.length);
    expect(screen.getByText('名前')).toBeInTheDocument();
    expect(screen.getByText('住所')).toBeInTheDocument();
    expect(screen.getByText('津波')).toBeInTheDocument();
  });

  it('reports the selected filter column', () => {
    const onToggleFilter = vi.fn();
    render(
      <ShelterTableHeader
        filters={emptyShelterColumnFilters}
        openFilterColumn={null}
        onToggleFilter={onToggleFilter}
        onFiltersChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '住所のフィルター' }));

    expect(onToggleFilter).toHaveBeenCalledWith('address');
  });
});
