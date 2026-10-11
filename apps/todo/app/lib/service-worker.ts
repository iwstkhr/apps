import { publicUrl } from '~/lib/public-url';

/**
 * Register the Service Worker so the app opens offline. sw.js is generated only in production builds
 * (buildEnd in react-router.config.ts), so it is not registered on the dev server.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register(publicUrl('sw.js')).catch((error: unknown) => {
    // Even if registration fails, the app works as before while online
    console.error('Failed to register the service worker', error);
  });
}
