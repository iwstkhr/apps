// The todo Service Worker. It precaches all build output so the app opens offline.
// At the end of the build, write-service-worker.ts prepends VERSION (a hash of the build output) and
// PRECACHE (a list of paths relative to sw.js) and writes the result to build/client/sw.js.
/* global VERSION, PRECACHE */
const CACHE_PREFIX = 'todo-';
const CACHE = `${CACHE_PREFIX}${VERSION}`;
// The index.html returned for every SPA path. Cloudflare redirects /index.html to /, so it is stored as /
const APP_SHELL = './';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      // Take control of open tabs right away. registerServiceWorker() reloads them the next time they are hidden
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
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Pages prefer the network, so the latest version always opens while online.
    // Only when offline, return the precached index.html
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(APP_SHELL, { cacheName: CACHE }).then((cached) => cached ?? Response.error()),
      ),
    );
    return;
  }

  // JS and CSS file names include a hash and their contents never change, so prefer the precached copies
  event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
});
