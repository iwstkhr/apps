// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MapHelpHint } from '~/components/map/map-help-hint';

describe('MapHelpHint', () => {
  it('describes map interactions for users', () => {
    render(<MapHelpHint />);

    expect(screen.getByRole('region', { name: '地図の操作方法' })).toBeInTheDocument();
    expect(screen.getByText('地図の操作')).toBeInTheDocument();
    expect(screen.getByText('ドラッグ')).toBeInTheDocument();
    expect(screen.getByText('クリック')).toBeInTheDocument();
    expect(screen.getByText('+ スクロール')).toBeInTheDocument();
  });
});
