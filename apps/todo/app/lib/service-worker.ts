import { publicUrl } from '~/lib/public-url';

/**
 * Register the Service Worker so the app opens offline. sw.js is generated only in production builds
 * (buildEnd in react-router.config.ts), so it is not registered on the dev server.
 *
 * When a new version takes control of an open page, the page reloads the next time it is hidden, so the
 * update applies without the user reloading by hand. Each time the page becomes visible again it asks
 * the browser to check for a new sw.js, because an installed PWA can stay open for days.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const { serviceWorker } = navigator;
  const registration = serviceWorker.register(publicUrl('sw.js'));
  registration.catch((error: unknown) => {
    // Even if registration fails, the app works as before while online
    console.error('Failed to register the service worker', error);
  });

  // The first install also claims the page, which is not an update and needs no reload
  let hasController = serviceWorker.controller !== null;
  let updateReady = false;

  const reloadIfIdle = () => {
    // Keep unsaved input such as an open dialog or an inline edit, and retry the next time the page is hidden
    if (document.visibilityState !== 'hidden' || isEditing()) return;
    window.location.reload();
  };

  const onControllerChange = () => {
    if (hasController) {
      updateReady = true;
      reloadIfIdle();
    }
    hasController = true;
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      if (updateReady) reloadIfIdle();
      return;
    }
    registration
      .then((r) => r.update())
      .catch(() => {
        // Offline or the server is unreachable. The next visit checks again
      });
  };

  serviceWorker.addEventListener('controllerchange', onControllerChange);
  document.addEventListener('visibilitychange', onVisibilityChange);
  return () => {
    serviceWorker.removeEventListener('controllerchange', onControllerChange);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}

// Focus on these stays after a click, but they hold nothing that a reload would lose
const NON_TEXT_INPUTS = new Set([
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'range',
  'color',
]);

function isEditing() {
  const active = document.activeElement;
  return (
    document.querySelector('dialog[open]') !== null ||
    (active instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(active.type)) ||
    active instanceof HTMLTextAreaElement ||
    active instanceof HTMLSelectElement ||
    (active instanceof HTMLElement && active.isContentEditable)
  );
}
