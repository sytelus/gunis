/** One-time/repeatable asset exports. Source PNGs are retained in design/assets.
 * This command resizes/encodes originals; it never calls a generation service. */
import { mkdir, copyFile } from 'node:fs/promises';
import sharp from 'sharp';

await Promise.all(
  ['public/assets/brand', 'public/fonts', 'public/icons', 'docs/licenses'].map((path) =>
    mkdir(path, { recursive: true }),
  ),
);
await sharp('design/assets/learning-loop.png')
  .webp({ quality: 89, effort: 6 })
  .toFile('public/assets/brand/learning-loop.webp');
await sharp('design/assets/guni-mark.png')
  .resize(256, 256)
  .png()
  .toFile('public/assets/brand/guni-mark.png');
await sharp('design/assets/guni-mark.png').resize(64, 64).png().toFile('public/favicon.png');
await sharp('design/assets/guni-mark.png')
  .resize(180, 180)
  .flatten({ background: '#f7f5f1' })
  .png()
  .toFile('public/apple-touch-icon.png');
await sharp('design/assets/social-cover.png')
  .resize(1200, 630, { fit: 'cover' })
  .jpeg({ quality: 89, mozjpeg: true })
  .toFile('public/assets/brand/social-cover.jpg');
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
  'pause',
  'play',
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
console.log('Exported optimized brand assets, fonts, icons, and licenses.');
