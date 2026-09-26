/** Build-time light colours for product cards. The lamp on the merch pages
 * takes on the colours of whatever the visitor looks at, so each product gets
 * the two most prominent saturated hues of its garment or print. Faces and
 * the studio backdrop are mostly cropped away; greys fall back to the brand
 * accent. Deterministic, and Sharp is the only dependency. */
import sharp from 'sharp';

const FALLBACK = ['#df4722', '#e6a25a'];
const BINS = 24;

const hex = (r, g, b) =>
  '#' +
  [r, g, b]
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');

/** Keeps the hue but settles saturation and lightness into a range that reads
 * as coloured light on warm paper. */
function asLight([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return hex(r * 255, g * 255, b * 255);
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  const S = Math.max(0.55, Math.min(0.85, s));
  const L = Math.max(0.46, Math.min(0.6, l));
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - c / 2;
  const [R, G, B] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return hex((R + m) * 255, (G + m) * 255, (B + m) * 255);
}

export async function productPalette(file) {
  const { data } = await sharp(file)
    .resize(150, 200, { fit: 'cover' })
    // The garment or print: skip the face above, the floor below and most of
    // the arms at the sides. Fine sampling keeps thin printed strokes.
    .extract({ left: 38, top: 62, width: 74, height: 80 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bins = Array.from({ length: BINS }, () => ({ weight: 0, r: 0, g: 0, b: 0 }));
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const max = Math.max(r, g, b);
    const chroma = max - Math.min(r, g, b);
    // Vivid, even when dark: thin inks on black tees are saturated but dim.
    if (chroma / max < 0.35 || max < 0.22 || chroma < 0.1) continue;
    let h =
      max === r ? ((g - b) / chroma) % 6 : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4;
    h = (h * 60 + 360) % 360;
    // Skin: warm hues with moderate saturation. Saturated orange prints stay.
    if (h > 4 && h < 48 && chroma / max < 0.64) continue;
    const weight = (chroma / max) ** 2 * chroma;
    const bin = bins[Math.floor(h / (360 / BINS)) % BINS];
    bin.weight += weight;
    bin.r += r * weight;
    bin.g += g * weight;
    bin.b += b * weight;
  }
  // Smooth neighbouring hues, then take the strongest and the strongest hue
  // at least 60 degrees away from it.
  const score = bins.map((_, i) =>
    [-1, 0, 1].reduce((sum, d) => sum + bins[(i + d + BINS) % BINS].weight * (d ? 0.5 : 1), 0),
  );
  const total = score.reduce((a, b) => a + b, 0);
  if (total < 1.5) return FALLBACK;
  const first = score.indexOf(Math.max(...score));
  const far = score.map((value, i) => {
    const gap = Math.min(Math.abs(i - first), BINS - Math.abs(i - first));
    return gap >= BINS / 8 ? value : -1;
  });
  const second = far.indexOf(Math.max(...far));
  const colour = (i) => {
    const bin = bins[i];
    return bin.weight
      ? asLight([bin.r / bin.weight, bin.g / bin.weight, bin.b / bin.weight])
      : null;
  };
  const a = colour(first) ?? FALLBACK[0];
  const b = score[second] > total * 0.05 ? (colour(second) ?? FALLBACK[1]) : FALLBACK[1];
  return [a, b];
}
