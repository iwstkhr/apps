import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const SERVICE_WORKER_FILE = 'sw.js';

// Cloudflare config files are not served, so they are not precached
const NOT_SERVED = new Set([SERVICE_WORKER_FILE, '.assetsignore', '_headers', '_redirects']);

/**
 * Determine the paths and version that the Service Worker precaches from the build output (build/client).
 * Paths are relative to sw.js, and index.html is replaced with the URL Cloudflare serves it at (./).
 * The version is derived from file contents, so rebuilding with the same contents does not change it.
 */
export async function collectPrecache(clientDir: string) {
  const entries = await readdir(clientDir, { recursive: true, withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(clientDir, path.join(entry.parentPath, entry.name)))
    .map((file) => file.split(path.sep).join('/'))
    .filter((file) => !NOT_SERVED.has(file) && !file.endsWith('.map'))
    .sort();

  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(`${file}\0`);
    hash.update(await readFile(path.join(clientDir, file)));
  }

  return {
    version: hash.digest('hex').slice(0, 12),
    urls: files.map((file) => (file === 'index.html' ? './' : file)),
  };
}

/** Add the version and precache paths to scripts/service-worker.js and write it to build/client/sw.js. */
export async function writeServiceWorker(clientDir: string) {
  const { version, urls } = await collectPrecache(clientDir);
  const source = await readFile(new URL('./service-worker.js', import.meta.url), 'utf8');
  await writeFile(
    path.join(clientDir, SERVICE_WORKER_FILE),
    `const VERSION = ${JSON.stringify(version)};\nconst PRECACHE = ${JSON.stringify(urls)};\n\n${source}`,
  );
}
