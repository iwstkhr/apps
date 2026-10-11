// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMapFlyOptions, MAP_FLY_DURATION_SECONDS } from '~/lib/map/fly-options';

function mockReducedMotion(reduce: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({ matches: reduce && query === '(prefers-reduced-motion: reduce)' }) as MediaQueryList,
  );
}

describe('getMapFlyOptions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('flies for a fixed short duration', () => {
    mockReducedMotion(false);
    expect(getMapFlyOptions()).toEqual({ duration: MAP_FLY_DURATION_SECONDS, animate: true });
  });

  it('jumps without animation when the user prefers reduced motion', () => {
    mockReducedMotion(true);
    expect(getMapFlyOptions()).toMatchObject({ animate: false });
  });
});
