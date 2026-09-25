/** One-time/repeatable asset exports. Source PNGs are retained in design/assets.
 * This command resizes/encodes originals; it never calls a generation service. */
import { mkdir, copyFile } from 'node:fs/promises';
import sharp from 'sharp';
import { exportSculptureMaps } from './sculpture-maps.mjs';

await Promise.all(
  ['public/assets/brand', 'public/fonts', 'public/icons', 'docs/licenses'].map((path) =>
    mkdir(path, { recursive: true }),
  ),
);
await sharp('design/assets/learning-loop.png')
  .webp({ quality: 89, effort: 6 })
  .toFile('public/assets/brand/learning-loop.webp');
// Owner-selected Linked G concept. Crop presentation whitespace, not the mark;
// reuse this framing for every size. Keep the original logo source for rollback.
const mark = sharp('design/concepts/guni-linked-g-v4.png').extract({
  left: 145,
  top: 149,
  width: 960,
  height: 960,
});
// The header's z-index makes it an isolated stacking context, so mix-blend-mode
// never reached the page paper and the raster's near-white square showed. Give
// the header/logo export a real alpha channel instead: color-to-alpha against the
// raster's own background, as GIMP does for a single color.
const { data: markPixels, info: markInfo } = await mark
  .clone()
  .resize(256, 256)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const markEdge = [0, 0, 0];
let markEdgeCount = 0;
for (let y = 0; y < markInfo.height; y++) {
  for (let x = 0; x < markInfo.width; x++) {
    if (x > 1 && y > 1 && x < markInfo.width - 2 && y < markInfo.height - 2) continue;
    for (let c = 0; c < 3; c++) markEdge[c] += markPixels[(y * markInfo.width + x) * 3 + c];
    markEdgeCount++;
  }
}
const markBackground = markEdge.map((total) => total / markEdgeCount);
const markRgba = Buffer.alloc(markInfo.width * markInfo.height * 4);
for (let p = 0; p < markInfo.width * markInfo.height; p++) {
  let alpha = 0;
  for (let c = 0; c < 3; c++)
    alpha = Math.max(alpha, (markBackground[c] - markPixels[p * 3 + c]) / markBackground[c]);
  alpha = Math.min(1, alpha);
  if (alpha < 0.02) continue; // transparent black; browsers filter premultiplied
  for (let c = 0; c < 3; c++) {
    const color = (markPixels[p * 3 + c] - (1 - alpha) * markBackground[c]) / alpha;
    markRgba[p * 4 + c] = Math.round(Math.min(255, Math.max(0, color)));
  }
  markRgba[p * 4 + 3] = Math.round(alpha * 255);
}
await sharp(markRgba, { raw: { width: markInfo.width, height: markInfo.height, channels: 4 } })
  .png()
  .toFile('public/assets/brand/guni-mark.png');
await mark.clone().resize(64, 64).png().toFile('public/favicon.png');
await mark
  .clone()
  .resize(180, 180)
  .flatten({ background: '#f7f5f1' })
  .png()
  .toFile('public/apple-touch-icon.png');
// The social card contains live copy. Export it separately with prepare:social
// instead of accidentally restoring the historical generated heading.
await copyFile(
  'node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2',
  'public/fonts/instrument-sans.woff2',
);
await copyFile(
  'node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2',
  'public/fonts/instrument-serif-italic.woff2',
);
for (const name of [
  'arrow-up-right',
  'arrow-up-left',
  'arrow-left',
  'arrow-right',
  'arrows-horizontal',
  'shuffle',
  'plus',
]) {
  await copyFile(
    `node_modules/@phosphor-icons/core/assets/light/${name}-light.svg`,
    `public/icons/${name}.svg`,
  );
}
await copyFile(
  'node_modules/@fontsource-variable/instrument-sans/LICENSE',
  'docs/licenses/instrument-sans.txt',
);
await copyFile(
  'node_modules/@fontsource/instrument-serif/LICENSE',
  'docs/licenses/instrument-serif.txt',
);
await copyFile('node_modules/@phosphor-icons/core/LICENSE', 'docs/licenses/phosphor.txt');
// Matte, inflation height and loop-path maps for the WebGL sculpture, derived from
// the same source artwork. Vite fingerprints the output because the client imports it.
await exportSculptureMaps();
console.log('Exported optimized brand assets, sculpture maps, fonts, icons, and licenses.');
