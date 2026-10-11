// Write PNG icons for the home screen and installation to public/.
// Draws the same design as favicon.svg with the installed Google Chrome (Playwright).
// Run only when the design changes, and commit the resulting PNGs:
//
//   node scripts/generate-icons.mjs
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const BLUE = '#2563eb';
const CHECK = 'M18 33l9 9 19-20';

// A blue rounded square (same as favicon.svg). The corners are transparent
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect x="4" y="4" width="56" height="56" rx="12" fill="${BLUE}"/>
  <path d="${CHECK}" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Fill the whole area with blue. The OS crops the shape (maskable, iOS), so the check mark stays within the central 80% safe zone
const fullBleed = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${BLUE}"/>
  <g transform="translate(32 32) scale(0.8) translate(-32 -32)">
    <path d="${CHECK}" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

const ICONS = [
  { file: 'icon-192.png', size: 192, svg: rounded },
  { file: 'icon-512.png', size: 512, svg: rounded },
  { file: 'icon-maskable-512.png', size: 512, svg: fullBleed },
  { file: 'apple-touch-icon.png', size: 180, svg: fullBleed },
];

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage();
  for (const { file, size, svg } of ICONS) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
    );
    const png = await page.locator('svg').screenshot({ omitBackground: true });
    await writeFile(new URL(`../public/${file}`, import.meta.url), png);
    console.log(`public/${file}`);
  }
} finally {
  await browser.close();
}
