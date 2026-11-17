import { publicUrl } from '~/lib/public-url';

/**
 * Register the Workbox service worker generated at build time (production builds only).
 *
 * The service worker answers navigations from its precache, so the first load after a deployment
 * still shows the previous version. The new worker takes over as soon as it finishes installing
 * (`skipWaiting` / `clientsClaim`), and at that point the page reloads once to show the new version.
 */
export async function registerServiceWorker(isProduction = import.meta.env.PROD): Promise<void> {
  if (!isProduction || !('serviceWorker' in navigator)) {
    return;
  }

  const { serviceWorker } = navigator;
  // Skip the reload on the first visit, where the worker only starts controlling an already up-to-date page
  if (serviceWorker.controller) {
    let reloading = false;
    serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  }

  try {
    await serviceWorker.register(publicUrl('sw.js'), {
      scope: import.meta.env.BASE_URL,
    });
  } catch (error) {
    // The app still works online without offline support
    console.warn('Service worker registration failed', error);
  }
}
