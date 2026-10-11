// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShelterTableHeader } from '~/components/table/shelter-table-header';
import { shelterTypeKeys } from '~/types/shelter-type';

describe('ShelterTableHeader', () => {
  it('renders text and disaster type columns', () => {
    render(<ShelterTableHeader />);

    expect(screen.getAllByRole('columnheader')).toHaveLength(2 + shelterTypeKeys.length);
    expect(screen.getByText('名前')).toBeInTheDocument();
    expect(screen.getByText('住所')).toBeInTheDocument();
    expect(screen.getByText('津波')).toBeInTheDocument();
  });
});
