// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';
import { L, openAttributionPrefixInNewTab } from '~/lib/leaflet';

describe('openAttributionPrefixInNewTab', () => {
  let map: L.Map | null = null;

  afterEach(() => {
    map?.remove();
    map = null;
  });

  it('opens the Leaflet credit link in a new tab and keeps its content', () => {
    const element = document.createElement('div');
    document.body.append(element);
    map = L.map(element).setView([35.4, 139.6], 8);

    openAttributionPrefixInNewTab(map);

    const link = element.querySelector<HTMLAnchorElement>('.leaflet-control-attribution a');
    expect(link).toHaveAttribute('href', 'https://leafletjs.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
    expect(link).toHaveTextContent('Leaflet');
  });
});
