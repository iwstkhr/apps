// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShelterDataLoadingOverlay } from '~/components/map/shelter-data-loading-overlay';

describe('ShelterDataLoadingOverlay', () => {
  it('announces shelter data loading to assistive technology', () => {
    render(<ShelterDataLoadingOverlay />);

    expect(screen.getByRole('status', { name: '避難場所データを読み込み中' })).toBeInTheDocument();
    expect(screen.getByText('データを読み込み中...')).toBeInTheDocument();
  });
});
