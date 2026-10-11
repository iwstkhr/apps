import { publicUrl } from '~/lib/public-url';

/** Register the Workbox service worker generated at build time (production builds only). */
export async function registerServiceWorker(isProduction = import.meta.env.PROD): Promise<void> {
  if (!isProduction || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register(publicUrl('sw.js'), {
      scope: import.meta.env.BASE_URL,
    });
  } catch (error) {
    // The app still works online without offline support
    console.warn('Service worker registration failed', error);
  }
}
