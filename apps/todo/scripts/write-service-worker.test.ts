import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { collectPrecache, writeServiceWorker } from './write-service-worker';

let clientDir: string;

beforeEach(async () => {
  clientDir = await mkdtemp(path.join(tmpdir(), 'todo-sw-'));
  await mkdir(path.join(clientDir, 'assets'));
  await writeFile(path.join(clientDir, 'index.html'), '<!doctype html>');
  await writeFile(path.join(clientDir, 'favicon.svg'), '<svg/>');
  await writeFile(path.join(clientDir, 'assets', 'root-abc.js'), 'console.log(1)');
  await writeFile(path.join(clientDir, 'assets', 'root-abc.js.map'), '{}');
  await writeFile(path.join(clientDir, '.assetsignore'), '');
});

afterEach(async () => {
  await rm(clientDir, { recursive: true, force: true });
});

describe('collectPrecache', () => {
  it('lists served files relative to sw.js and serves index.html as ./', async () => {
    const { urls } = await collectPrecache(clientDir);

    expect(urls).toEqual(['assets/root-abc.js', 'favicon.svg', './']);
  });

  it('changes the version only when a file changes', async () => {
    const first = await collectPrecache(clientDir);
    expect((await collectPrecache(clientDir)).version).toBe(first.version);

    await writeFile(path.join(clientDir, 'assets', 'root-abc.js'), 'console.log(2)');

    expect((await collectPrecache(clientDir)).version).not.toBe(first.version);
  });

  it('does not precache the service worker itself', async () => {
    await writeServiceWorker(clientDir);

    expect((await collectPrecache(clientDir)).urls).not.toContain('sw.js');
  });
});

describe('writeServiceWorker', () => {
  it('writes sw.js with the version and the precache list before the worker source', async () => {
    await writeServiceWorker(clientDir);
    const { version } = await collectPrecache(clientDir);

    const source = await readFile(path.join(clientDir, 'sw.js'), 'utf8');

    expect(source).toMatch(
      new RegExp(
        `^const VERSION = "${version}";\\nconst PRECACHE = \\["assets/root-abc.js","favicon.svg","./"\\];\\n`,
      ),
    );
    expect(source).toContain("self.addEventListener('fetch'");
  });
});
