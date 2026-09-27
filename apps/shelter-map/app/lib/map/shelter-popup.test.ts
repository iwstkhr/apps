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

  it('escapes HTML special characters in shelter name and address', () => {
    const html = getPopupContent(
      createShelter({
        name: '<img src=x onerror="alert(1)">避難所',
        address: "A&B's <町>",
      }),
    );

    expect(html).not.toContain('<img');
    expect(html).toContain('<strong>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;避難所</strong>');
    expect(html).toContain('A&amp;B&#39;s &lt;町&gt;');
  });
});
