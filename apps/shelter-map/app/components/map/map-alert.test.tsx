// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MapAlert } from '~/components/map/map-alert';

describe('MapAlert', () => {
  it('shows the message and can be dismissed', () => {
    const onDismiss = vi.fn();
    render(<MapAlert message="現在地を取得できませんでした。" onDismiss={onDismiss} />);

    expect(screen.getByRole('alert')).toHaveTextContent('現在地を取得できませんでした。');
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
