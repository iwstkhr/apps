/**
 * PWA 用の Service Worker (ビルド時に src/sw.js から dist/sw.js を作る) を登録する。
 * 開発サーバには sw.js が無く、HMR の邪魔にもなるので本番ビルドだけで登録する。
 */
export function registerServiceWorker(enabled = import.meta.env.PROD): void {
  if (!enabled || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 登録できなくても通常の Web ページとしては動くので無視してよい
    });
  });
}
