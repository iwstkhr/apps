import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from './serviceWorker';

describe('registerServiceWorker', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('registers /sw.js after the page has loaded', () => {
    const register = vi.fn(() => Promise.resolve({}));
    vi.stubGlobal('navigator', { serviceWorker: { register } });
    const addEventListener = vi.spyOn(window, 'addEventListener');
    registerServiceWorker(true);
    expect(register).not.toHaveBeenCalled();

    const [type, onLoad] = addEventListener.mock.calls[0]!;
    expect(type).toBe('load');
    (onLoad as () => void)();
    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it('does nothing outside production builds', () => {
    vi.stubGlobal('navigator', { serviceWorker: { register: vi.fn() } });
    const addEventListener = vi.spyOn(window, 'addEventListener');
    registerServiceWorker(false);
    expect(addEventListener).not.toHaveBeenCalled();
  });

  it('does nothing when the browser has no service worker support', () => {
    vi.stubGlobal('navigator', {});
    const addEventListener = vi.spyOn(window, 'addEventListener');
    registerServiceWorker(true);
    expect(addEventListener).not.toHaveBeenCalled();
  });
});
