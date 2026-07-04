import { describe, expect, it } from 'vitest';
import { getPopupContent } from '~/lib/map/shelter-popup';
import { createShelter } from '~/test/fixtures';

describe('getPopupContent', () => {
  it('includes shelter name, address, and disaster type labels', () => {
    const html = getPopupContent(createShelter());

    expect(html).toContain('<strong>テスト避難所</strong>');
    expect(html).toContain('神奈川県横浜市');
    expect(html).toContain('class="app-content-ready shelter-type-ready">洪水</span>');
    expect(html).toContain('class="app-content-not-ready shelter-type-not-ready">津波</span>');
  });
});
