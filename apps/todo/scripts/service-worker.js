// todo の Service Worker。オフラインでも開けるよう、ビルド出力をすべて先読みしておく。
// ビルドの最後に write-service-worker.ts が、先頭に VERSION (ビルド出力のハッシュ) と
// PRECACHE (sw.js から見た相対パスの一覧) を足して build/client/sw.js に書き出す。
/* global VERSION, PRECACHE */
const CACHE_PREFIX = 'todo-';
const CACHE = `${CACHE_PREFIX}${VERSION}`;
// SPA のどのパスにも返す index.html。Cloudflare は /index.html を / へリダイレクトするので / で持つ
const APP_SHELL = './';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      // 開いているタブにもすぐ新しい版を使わせる。画面は再読み込みしない
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
    // 画面はネットワークを優先して、つながっていれば常に最新の版を開く。
    // つながらないときだけ先読みした index.html を返す
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(APP_SHELL, { cacheName: CACHE }).then((cached) => cached ?? Response.error()),
      ),
    );
    return;
  }

  // JS や CSS はファイル名にハッシュが付いていて中身が変わらないので、先読みしたものを優先する
  event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
});
