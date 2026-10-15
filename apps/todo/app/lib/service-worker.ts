import { publicUrl } from '~/lib/public-url';

/**
 * Register the Service Worker so the app opens offline. sw.js is generated only in production builds
 * (buildEnd in react-router.config.ts), so it is not registered on the dev server.
 *
 * When a new version takes control of an open page, the page reloads the next time the user looks away
 * (the page is hidden or the window loses focus), so the update applies without the user reloading by
 * hand. The page asks the browser to check for a new sw.js whenever the user leaves or comes back,
 * because an installed PWA can stay open for days. A check on leaving lets the update install and the
 * page reload while the user is away, so they come back to the new version.
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
    // Reload only while the user is looking elsewhere, and keep unsaved input such as an open dialog or an
    // inline edit. Otherwise retry the next time the user looks away
    if (!isAway() || isEditing()) return;
    window.location.reload();
  };

  const checkForUpdate = () => {
    registration
      .then((r) => r.update())
      .catch(() => {
        // Offline or the server is unreachable. The next check tries again
      });
  };

  const onControllerChange = () => {
    if (hasController) {
      updateReady = true;
      reloadIfIdle();
    }
    hasController = true;
  };

  // Leaving: apply a ready update, or check for one so it can install and reload while the user is away
  const onLeave = () => {
    if (updateReady) reloadIfIdle();
    else checkForUpdate();
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') onLeave();
    else checkForUpdate();
  };

  // Switching to another window leaves the page visible, so focus and blur cover what visibilitychange misses
  serviceWorker.addEventListener('controllerchange', onControllerChange);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('focus', checkForUpdate);
  window.addEventListener('blur', onLeave);
  return () => {
    serviceWorker.removeEventListener('controllerchange', onControllerChange);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('focus', checkForUpdate);
    window.removeEventListener('blur', onLeave);
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

function isAway() {
  return document.visibilityState === 'hidden' || !document.hasFocus();
}

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
