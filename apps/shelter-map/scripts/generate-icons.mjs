// Render the PWA icons in public/icons/ from public/favicon.svg.
//
// Run once after changing favicon.svg and commit the generated PNGs:
//   node scripts/generate-icons.mjs
//
// Uses the installed Google Chrome through Playwright (a devDependency), so no image tool is needed.
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUT_DIR = `${ROOT}public/icons/`;
const BACKGROUND = '#ffffff';

const svg = readFileSync(`${ROOT}public/favicon.svg`, 'utf8');
const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

// padding: share of each side left empty (favicon.svg already has a margin that keeps the artwork inside the maskable safe zone)
const ICONS = [
  { file: 'icon-192.png', size: 192, padding: 0, background: 'transparent' },
  { file: 'icon-512.png', size: 512, padding: 0, background: 'transparent' },
  { file: 'icon-maskable-512.png', size: 512, padding: 0.05, background: BACKGROUND },
  { file: 'apple-touch-icon.png', size: 180, padding: 0.08, background: BACKGROUND },
];

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const { file, size, padding, background } of ICONS) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    const inset = Math.round(size * padding);
    await page.setContent(
      `<body style="margin:0;background:${background}">
        <img src="${svgDataUrl}" style="display:block;box-sizing:border-box;width:${size}px;height:${size}px;padding:${inset}px">
      </body>`,
    );
    await page.locator('img').evaluate((img) => img.decode());
    await page.screenshot({
      path: `${OUT_DIR}${file}`,
      omitBackground: background === 'transparent',
    });
    await page.close();
    console.log(`Wrote public/icons/${file}`);
  }
} finally {
  await browser.close();
}
