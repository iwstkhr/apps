import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const SERVICE_WORKER_FILE = 'sw.js';

// Cloudflare の設定ファイルは配信されないので先読みしない
const NOT_SERVED = new Set([SERVICE_WORKER_FILE, '.assetsignore', '_headers', '_redirects']);

/**
 * ビルド出力 (build/client) から、Service Worker が先読みするパスと版を求める。
 * パスは sw.js から見た相対パスで、index.html は Cloudflare が配信する URL (./) に置き換える。
 * 版はファイルの中身から求めるので、ビルドし直しても中身が同じなら変わらない。
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

/** scripts/service-worker.js に版と先読みするパスを足して、build/client/sw.js に書き出す。 */
export async function writeServiceWorker(clientDir: string) {
  const { version, urls } = await collectPrecache(clientDir);
  const source = await readFile(new URL('./service-worker.js', import.meta.url), 'utf8');
  await writeFile(
    path.join(clientDir, SERVICE_WORKER_FILE),
    `const VERSION = ${JSON.stringify(version)};\nconst PRECACHE = ${JSON.stringify(urls)};\n\n${source}`,
  );
}
