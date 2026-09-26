// Service Worker の本体。ビルド時に vite.config.ts の serviceWorker プラグインが
// 先頭へ VERSION (ビルド内容のハッシュ) と PRECACHE (画面の起動に要るファイル) を足して
// dist/sw.js として出力する。開発サーバでは登録しない (src/lib/serviceWorker.ts)。
//
// キャッシュするのはビルド成果物 (HTML / JS / CSS / 画像) だけ。/api は一切触らず、
// イベントや回答のデータ・トークンがブラウザのキャッシュに残らないようにする。
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
    // 画面は常にネットワークから取り、オフラインのときだけキャッシュの index.html で起動する。
    // URL ごとには保存しない (管理用 URL などをキャッシュのキーに残さない)
    event.respondWith(fetch(request).catch(() => caches.match('/')));
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    // ファイル名にハッシュが付いていて中身が変わらないので、キャッシュを優先する
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

  // favicon などの public/ のファイルは名前が変わらないので、ネットワークを優先する
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
