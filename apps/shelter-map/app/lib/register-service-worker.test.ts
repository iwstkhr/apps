import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from '~/lib/register-service-worker';

function stubServiceWorker(register: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('navigator', { serviceWorker: { register } });
}

describe('registerServiceWorker', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('registers sw.js under BASE_URL in production', async () => {
    const register = vi.fn().mockResolvedValue({});
    stubServiceWorker(register);

    await registerServiceWorker(true);

    expect(register).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    });
  });

  it('does nothing outside production', async () => {
    const register = vi.fn();
    stubServiceWorker(register);

    await registerServiceWorker(false);

    expect(register).not.toHaveBeenCalled();
  });

  it('does nothing when the browser has no service worker support', async () => {
    vi.stubGlobal('navigator', {});

    await expect(registerServiceWorker(true)).resolves.toBeUndefined();
  });

  it('warns instead of throwing when registration fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    stubServiceWorker(vi.fn().mockRejectedValue(new Error('blocked')));

    await registerServiceWorker(true);

    expect(warn).toHaveBeenCalledOnce();
  });
});
