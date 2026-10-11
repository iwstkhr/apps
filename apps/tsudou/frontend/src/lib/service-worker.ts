/**
 * Register the Service Worker for the PWA (dist/sw.js is built from src/sw.js at build time).
 * The dev server has no sw.js and it would interfere with HMR, so it is registered only in production builds.
 */
export function registerServiceWorker(enabled = import.meta.env.PROD): void {
  if (!enabled || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Even if registration fails, it still works as a normal web page, so this can be ignored
    });
  });
}
