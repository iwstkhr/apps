export async function decompressGzipResponse(response: Response): Promise<string> {
  if (!response.ok) {
    throw new Error(`Failed to fetch resource: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Vite dev server and some hosts (e.g. GitHub Pages) may serve decompressed content.
  const isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  if (!isGzip) {
    return new TextDecoder().decode(bytes);
  }

  const decompressedStream = new Blob([buffer])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  return new Response(decompressedStream).text();
}
