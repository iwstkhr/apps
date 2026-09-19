import type { Shelter } from '~/types/shelter';
import { ShelterTypeJapanese, shelterTypeKeys } from '~/types/shelter-type';

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

// Leaflet renders string popup content as HTML, so dataset values must be escaped.
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

export function getPopupContent(shelter: Shelter): string {
  let popup = `<strong>${escapeHtml(shelter.name)}</strong><br/>${escapeHtml(shelter.address)}<hr class="shelter-popup-divider"/>`;

  popup += shelterTypeKeys
    .map((key) => {
      const status = shelter.type[key] ? 'ready' : 'not-ready';
      const name = escapeHtml(ShelterTypeJapanese.get(key) ?? key);
      return `<span class="app-content-${status} shelter-type-${status}">${name}</span>`;
    })
    .join('<br/>');

  return popup;
}
