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

// Opens directions in Google Maps; the starting point is left to Google Maps itself.
export function getDirectionsUrl(shelter: Shelter): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${shelter.latitude},${shelter.longitude}`;
}

export function getPopupContent(shelter: Shelter): string {
  let popup = `<strong>${escapeHtml(shelter.name)}</strong><br/>${escapeHtml(shelter.address)}<hr class="shelter-popup-divider"/>`;

  popup += shelterTypeKeys
    .map((key) => {
      const status = shelter.type[key] ? 'ready' : 'not-ready';
      const name = escapeHtml(ShelterTypeJapanese[key]);
      return `<span class="app-content-${status} shelter-type-${status}">${name}</span>`;
    })
    .join('<br/>');

  popup += `<hr class="shelter-popup-divider"/><a class="shelter-popup-directions" href="${escapeHtml(getDirectionsUrl(shelter))}" target="_blank" rel="noreferrer">経路を開く (Google マップ)</a>`;

  return popup;
}
