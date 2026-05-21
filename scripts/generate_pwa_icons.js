/**
 * Generates PNG icons from the SVG sources for broader PWA install support.
 * Run: pnpm run generate:pwa-icons
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = join(root, 'public', 'icons');

function renderPng(svgPath, size, outPath) {
  const svg = readFileSync(svgPath, 'utf8');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size }
  });
  const png = resvg.render().asPng();
  writeFileSync(outPath, png);
  console.log(`Wrote ${outPath}`);
}

renderPng(join(iconsDir, 'icon.svg'), 192, join(iconsDir, 'icon-192.png'));
renderPng(join(iconsDir, 'icon.svg'), 512, join(iconsDir, 'icon-512.png'));
renderPng(join(iconsDir, 'icon-maskable.svg'), 512, join(iconsDir, 'icon-maskable-512.png'));
