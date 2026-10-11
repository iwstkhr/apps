// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShelterFilterBar } from '~/components/filter/shelter-filter-bar';
import { emptyShelterFilters } from '~/types/shelter-filters';

describe('ShelterFilterBar', () => {
  it('reports keyword input', () => {
    const onChange = vi.fn();
    render(<ShelterFilterBar filters={emptyShelterFilters} onChange={onChange} />);

    fireEvent.change(screen.getByRole('searchbox', { name: '名前・住所で検索' }), {
      target: { value: '横浜' },
    });

    expect(onChange).toHaveBeenCalledWith({ ...emptyShelterFilters, keyword: '横浜' });
  });

  it('toggles disaster type chips', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ShelterFilterBar filters={emptyShelterFilters} onChange={onChange} />,
    );

    const tsunami = screen.getByRole('button', { name: '津波' });
    expect(tsunami).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(tsunami);
    expect(onChange).toHaveBeenLastCalledWith({ ...emptyShelterFilters, types: ['tsunami'] });

    rerender(
      <ShelterFilterBar
        filters={{ ...emptyShelterFilters, types: ['tsunami'] }}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('button', { name: '津波' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '津波' }));
    expect(onChange).toHaveBeenLastCalledWith(emptyShelterFilters);
  });

  it('shows the non-matching option and the clear button only when filters are active', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ShelterFilterBar filters={emptyShelterFilters} onChange={onChange} />,
    );

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '条件をクリア' })).not.toBeInTheDocument();

    rerender(
      <ShelterFilterBar
        filters={{ ...emptyShelterFilters, keyword: '横浜', types: ['flood'], withinMapOnly: true }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ types: ['flood'], showNonMatching: true }),
    );

    fireEvent.click(screen.getByRole('button', { name: '条件をクリア' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...emptyShelterFilters, withinMapOnly: true });
  });
});
