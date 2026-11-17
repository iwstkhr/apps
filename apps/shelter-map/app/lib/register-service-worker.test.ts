import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from '~/lib/register-service-worker';

function stubServiceWorker(register: ReturnType<typeof vi.fn>, controller: object | null = null) {
  const listeners: Array<() => void> = [];
  const addEventListener = vi.fn((_type: string, listener: () => void) => {
    listeners.push(listener);
  });
  vi.stubGlobal('navigator', { serviceWorker: { register, controller, addEventListener } });
  return {
    addEventListener,
    fireControllerChange: () => {
      for (const listener of listeners) listener();
    },
  };
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

  it('reloads once when a new worker takes over a controlled page', async () => {
    const reload = vi.fn();
    vi.stubGlobal('window', { location: { reload } });
    const { addEventListener, fireControllerChange } = stubServiceWorker(
      vi.fn().mockResolvedValue({}),
      {},
    );

    await registerServiceWorker(true);
    fireControllerChange();
    fireControllerChange();

    expect(addEventListener).toHaveBeenCalledWith('controllerchange', expect.any(Function));
    expect(reload).toHaveBeenCalledOnce();
  });

  it('does not reload on the first visit, when no worker controls the page yet', async () => {
    const { addEventListener } = stubServiceWorker(vi.fn().mockResolvedValue({}));

    await registerServiceWorker(true);

    expect(addEventListener).not.toHaveBeenCalled();
  });
});
