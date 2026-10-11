import { publicUrl } from '~/lib/public-url';

/**
 * オフラインでも開けるよう Service Worker を登録する。sw.js は本番ビルドでだけ作られるので
 * (react-router.config.ts の buildEnd)、開発サーバーでは登録しない。
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register(publicUrl('sw.js')).catch((error: unknown) => {
    // 登録できなくても、オンラインならこれまでどおり使える
    console.error('Failed to register the service worker', error);
  });
}
