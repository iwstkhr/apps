// Generate build/client/sw.js with Workbox after `react-router build` (called from the build script).
//
// - Precache the app shell and the evacuation site GeoJSON so the app opens offline.
//   Revisions are content hashes, so the monthly GeoJSON update replaces the cached copy.
// - Cache map tiles the user has viewed (no prefetching, per the OpenStreetMap tile usage policy).
//
//   BASE_PATH  Sub-path the app is served under (same as vite.config.ts)
import { fileURLToPath } from 'node:url';
import { generateSW } from 'workbox-build';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
// Always a production build, so BASE_PATH applies whenever it is set
const BASE = process.env.BASE_PATH || '/';
const DAY_SECONDS = 24 * 60 * 60;

const tileCache = (cacheName) => ({
  handler: 'CacheFirst',
  options: {
    cacheName,
    expiration: { maxEntries: 1000, maxAgeSeconds: 30 * DAY_SECONDS },
    // Tiles are fetched with CORS (crossOrigin on the tile layers), so opaque responses never reach the cache
    cacheableResponse: { statuses: [200] },
  },
});

const { count, size, warnings } = await generateSW({
  globDirectory: `${ROOT}build/client`,
  globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,gz}'],
  // The GeoJSON is about 5 MB (the default limit is 2 MB)
  maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
  // Vite already puts a content hash in these file names, so skip the extra revision query
  dontCacheBustURLsMatching: /\/assets\/.+-[\w-]{8}\.(?:js|css)$/,
  modifyURLPrefix: { '': BASE },
  swDest: `${ROOT}build/client/sw.js`,
  navigateFallback: `${BASE}index.html`,
  // Apply new deployments on the next load without asking
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  // Use the bundled Workbox runtime instead of loading it from a CDN
  inlineWorkboxRuntime: true,
  sourcemap: false,
  runtimeCaching: [
    { urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\//, ...tileCache('tiles-osm') },
    { urlPattern: /^https:\/\/cyberjapandata\.gsi\.go\.jp\//, ...tileCache('tiles-gsi') },
  ],
});

for (const warning of warnings) console.warn(warning);
console.log(`Generated sw.js precaching ${count} files (${(size / 1024 / 1024).toFixed(1)} MB)`);
