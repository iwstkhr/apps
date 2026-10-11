// The Service Worker itself. At build time, the serviceWorker plugin in vite.config.ts
// prepends VERSION (a hash of the build contents) and PRECACHE (files needed to start the UI)
// and outputs it as dist/sw.js. It is not registered on the dev server (src/lib/service-worker.ts).
//
// Only build output (HTML / JS / CSS / images) is cached. /api is never touched,
// so event and response data and tokens never remain in the browser cache.
/* global VERSION, PRECACHE */

const CACHE_PREFIX = 'tsudou-';
const CACHE = `${CACHE_PREFIX}${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    // Pages always come from the network, and only offline does the cached index.html start the app.
    // Nothing is stored per URL (so URLs such as the manage URL are never kept as cache keys)
    event.respondWith(fetch(request).catch(() => caches.match('/')));
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    // File names include a hash and their contents never change, so prefer the cache
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Files in public/ such as the favicon keep their names, so prefer the network
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
