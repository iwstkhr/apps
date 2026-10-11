// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CurrentLocationButton } from '~/components/map/current-location-button';

describe('CurrentLocationButton', () => {
  it('requests the current location and is disabled while locating', () => {
    const onClick = vi.fn();
    const { rerender } = render(<CurrentLocationButton isLocating={false} onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: '現在地を表示' }));
    expect(onClick).toHaveBeenCalledOnce();

    rerender(<CurrentLocationButton isLocating onClick={onClick} />);
    expect(screen.getByRole('button', { name: '現在地を表示' })).toBeDisabled();
  });
});
