import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { productPalette } from '../scripts/palette.mjs';

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hue = (hex) => {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};
/** A portrait "product photo": pale backdrop, a garment block in the middle. */
async function photo(garment, print) {
  const width = 300;
  const height = 400;
  const pixels = Buffer.alloc(width * height * 3, 245);
  for (let y = 120; y < 320; y++)
    for (let x = 90; x < 210; x++) {
      const inPrint = print && y > 180 && y < 260 && x > 120 && x < 180;
      pixels.set(inPrint ? print : garment, (y * width + x) * 3);
    }
  return sharp(pixels, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
}

test('product light colours follow the garment and its print, not the backdrop', async () => {
  const blue = await productPalette(await photo([40, 110, 200]));
  assert.ok(Math.abs(hue(blue[0]) - 212) < 20, `blue dress lights blue (${blue})`);
  const printed = await productPalette(await photo([20, 20, 22], [40, 190, 120]));
  assert.ok(
    Math.abs(hue(printed[0]) - 150) < 25,
    `a green print on black lights green (${printed})`,
  );
});

test('grey products fall back to the brand light; results are valid colours', async () => {
  assert.deepEqual(await productPalette(await photo([128, 128, 130])), ['#df4722', '#e6a25a']);
  for (const colour of await productPalette(await photo([200, 60, 50], [240, 200, 40])))
    assert.match(colour, /^#[0-9a-f]{6}$/);
});

test('skin tones do not become product light', async () => {
  // A white tee on a model: the skin-coloured arms must not win.
  const width = 300;
  const height = 400;
  const pixels = Buffer.alloc(width * height * 3, 245);
  for (let y = 120; y < 320; y++)
    for (let x = 60; x < 240; x++) {
      const arm = x < 95 || x > 205;
      pixels.set(arm ? [214, 160, 130] : [250, 250, 250], (y * width + x) * 3);
    }
  const image = await sharp(pixels, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
  assert.deepEqual(await productPalette(image), ['#df4722', '#e6a25a']);
});
