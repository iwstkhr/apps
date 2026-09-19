import { describe, expect, it } from 'vitest';
import { DEFAULT_TILE_LAYER, TILE_LAYERS, tileLayerKeys } from '~/types/tile-layer';

describe('tile layer definitions', () => {
  it('lists every tile layer key with OpenStreetMap as the default', () => {
    expect(tileLayerKeys).toEqual(['osm', 'gia_photo']);
    expect(DEFAULT_TILE_LAYER).toBe('osm');
  });

  it('defines a label, URL template, and attribution for every tile layer', () => {
    for (const key of tileLayerKeys) {
      const { label, url, attribution } = TILE_LAYERS[key];

      expect(label).not.toBe('');
      expect(url).toMatch(/^https:\/\/.+\{z\}\/\{x\}\/\{y\}\.(png|jpg)$/);
      expect(attribution).not.toBe('');
    }
  });
});
