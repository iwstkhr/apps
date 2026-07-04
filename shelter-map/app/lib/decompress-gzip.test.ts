import { describe, expect, it } from 'vitest';
import { decompressGzipResponse } from '~/lib/decompress-gzip';

async function gzipText(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

describe('decompressGzipResponse', () => {
  it('throws when the response is not ok', async () => {
    const response = new Response(null, { status: 404 });

    await expect(decompressGzipResponse(response)).rejects.toThrow('Failed to fetch resource: 404');
  });

  it('returns plain text when the body is not gzip-compressed', async () => {
    const response = new Response('{"type":"FeatureCollection"}', { status: 200 });

    await expect(decompressGzipResponse(response)).resolves.toBe('{"type":"FeatureCollection"}');
  });

  it('decompresses gzip-encoded bodies', async () => {
    const payload = '{"type":"FeatureCollection","features":[]}';
    const compressed = await gzipText(payload);
    const response = new Response(compressed.buffer as ArrayBuffer, { status: 200 });

    await expect(decompressGzipResponse(response)).resolves.toBe(payload);
  });
});
