// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from '~/lib/service-worker';

const update = vi.fn(() => Promise.resolve());
const reload = vi.fn();
let cleanup: (() => void) | undefined;

function setUp({ controlled }: { controlled: boolean }) {
  const serviceWorker = new EventTarget() as EventTarget & Record<string, unknown>;
  serviceWorker.controller = controlled ? {} : null;
  serviceWorker.register = vi.fn(() => Promise.resolve({ update }));
  Object.defineProperty(navigator, 'serviceWorker', { value: serviceWorker, configurable: true });
  cleanup = registerServiceWorker();
  return serviceWorker;
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  vi.stubEnv('PROD', true);
  Object.defineProperty(window, 'location', {
    value: { ...window.location, reload },
    configurable: true,
  });
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.innerHTML = '';
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('registerServiceWorker', () => {
  it('reloads on the next hide after an update takes control', () => {
    const serviceWorker = setUp({ controlled: true });

    serviceWorker.dispatchEvent(new Event('controllerchange'));
    expect(reload).not.toHaveBeenCalled();

    setVisibility('hidden');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads right away when the update arrives while hidden', () => {
    const serviceWorker = setUp({ controlled: true });
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });

    serviceWorker.dispatchEvent(new Event('controllerchange'));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload when the first install claims the page', () => {
    const serviceWorker = setUp({ controlled: false });

    serviceWorker.dispatchEvent(new Event('controllerchange'));
    setVisibility('hidden');
    expect(reload).not.toHaveBeenCalled();
  });

  it('waits while the user is typing or a dialog is open', () => {
    const serviceWorker = setUp({ controlled: true });
    serviceWorker.dispatchEvent(new Event('controllerchange'));

    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    setVisibility('hidden');
    expect(reload).not.toHaveBeenCalled();

    input.remove();
    document.body.innerHTML = '<dialog open></dialog>';
    setVisibility('visible');
    setVisibility('hidden');
    expect(reload).not.toHaveBeenCalled();

    document.body.innerHTML = '';
    setVisibility('visible');
    setVisibility('hidden');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('checks for a new version each time the page becomes visible', async () => {
    setUp({ controlled: true });

    setVisibility('hidden');
    setVisibility('visible');
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(reload).not.toHaveBeenCalled();
  });
});
