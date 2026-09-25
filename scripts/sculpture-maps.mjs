/** Derives data maps for the WebGL sculpture from the committed artwork. This is
 * deterministic image processing of design/assets/learning-loop.png; it never
 * calls a generation service. The PNG holds RGB data only, with no alpha channel,
 * so browsers cannot premultiply or discard the values when decoding:
 *   R  matte: the sculpture body, excluding its floor glow and both loop openings
 *   G  inflation height: 0 at the silhouette edge, 1 along the middle of the tube
 *   B  path s: position along the figure-8 centerline in src/data/loop-path.json
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import sharp from 'sharp';

const INF = 1e20;
// The studio backdrop varies by about ±1 level. Anything further away is sculpture,
// glass caustics or floor glow.
const BACKDROP_TOLERANCE = 6;
const SAMPLES_PER_SEGMENT = 48;

/** Felzenszwalb & Huttenlocher's lower envelope of parabolas: exact 1D squared distances. */
function squaredDistance1d(f, n, d, v, z) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

/** Exact Euclidean distance from each pixel to the nearest pixel where `feature` is set. */
function distanceField(feature, width, height) {
  const out = new Float64Array(width * height);
  const n = Math.max(width, height);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) f[y] = feature[y * width + x] ? 0 : INF;
    squaredDistance1d(f, height, d, v, z);
    for (let y = 0; y < height; y++) out[y * width + x] = d[y];
  }
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) f[x] = out[row + x];
    squaredDistance1d(f, width, d, v, z);
    for (let x = 0; x < width; x++) out[row + x] = Math.sqrt(d[x]);
  }
  return out;
}

/** 4-connected components of a binary mask. Label 0 means "not in the mask". */
function components(mask, width, height) {
  const labels = new Int32Array(width * height);
  const stack = new Int32Array(width * height);
  const sizes = [0];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start]) continue;
    const id = sizes.length;
    let top = 0;
    let size = 0;
    stack[top++] = start;
    labels[start] = id;
    while (top) {
      const p = stack[--top];
      size++;
      const x = p % width;
      for (const q of [
        x > 0 ? p - 1 : -1,
        x < width - 1 ? p + 1 : -1,
        p >= width ? p - width : -1,
        p < mask.length - width ? p + width : -1,
      ]) {
        if (q >= 0 && mask[q] && !labels[q]) {
          labels[q] = id;
          stack[top++] = q;
        }
      }
    }
    sizes.push(size);
  }
  return { labels, sizes };
}

function largestComponent(mask, width, height) {
  const { labels, sizes } = components(mask, width, height);
  let best = 0;
  for (let id = 1; id < sizes.length; id++) if (sizes[id] > sizes[best]) best = id;
  return Uint8Array.from(labels, (id) => (id === best && best > 0 ? 1 : 0));
}

const invert = (mask) => Uint8Array.from(mask, (value) => 1 - value);
// Disk-shaped morphology through distance fields keeps the matte free of blocky steps.
const dilate = (mask, width, height, r) =>
  Uint8Array.from(distanceField(mask, width, height), (d) => (d <= r ? 1 : 0));
const erode = (mask, width, height, r) =>
  Uint8Array.from(distanceField(invert(mask), width, height), (d) => (d > r ? 1 : 0));

/** Separable Gaussian blur with clamped edges. */
function blur(src, width, height, sigma) {
  const radius = Math.ceil(sigma * 3);
  const kernel = new Float64Array(radius * 2 + 1);
  let total = 0;
  for (let i = -radius; i <= radius; i++) {
    kernel[i + radius] = Math.exp(-(i * i) / (2 * sigma * sigma));
    total += kernel[i + radius];
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= total;
  const tmp = new Float64Array(width * height);
  const out = new Float64Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++)
        acc += src[row + Math.min(width - 1, Math.max(0, x + k))] * kernel[k + radius];
      tmp[row + x] = acc;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++)
        acc += tmp[Math.min(height - 1, Math.max(0, y + k)) * width + x] * kernel[k + radius];
      out[y * width + x] = acc;
    }
  }
  return out;
}

/** Separable sliding-window maximum; `half` pixels on each side. */
function maxFilter(src, width, height, half) {
  const tmp = new Float64Array(width * height);
  const out = new Float64Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let best = 0;
      for (let k = Math.max(0, x - half); k <= Math.min(width - 1, x + half); k++)
        best = Math.max(best, src[y * width + k]);
      tmp[y * width + x] = best;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let best = 0;
      for (let k = Math.max(0, y - half); k <= Math.min(height - 1, y + half); k++)
        best = Math.max(best, tmp[k * width + x]);
      out[y * width + x] = best;
    }
  }
  return out;
}

/** Area-averaging resample, exact for fractional source footprints. */
function areaResample(src, sw, sh, dw, dh) {
  const pass = (read, count, from, to, write) => {
    const scale = from / to;
    for (let o = 0; o < to; o++) {
      const a = o * scale;
      const b = a + scale;
      for (let line = 0; line < count; line++) {
        let acc = 0;
        for (let i = Math.floor(a); i < Math.min(from, Math.ceil(b)); i++)
          acc += read(line, i) * (Math.min(b, i + 1) - Math.max(a, i));
        write(line, o, acc / scale);
      }
    }
  };
  const tmp = new Float64Array(dw * sh);
  pass(
    (y, x) => src[y * sw + x],
    sh,
    sw,
    dw,
    (y, x, value) => (tmp[y * dw + x] = value),
  );
  const out = new Float64Array(dw * dh);
  pass(
    (x, y) => tmp[y * dw + x],
    dw,
    sh,
    dh,
    (x, y, value) => (out[y * dw + x] = value),
  );
  return out;
}

/** Least-squares axis-aligned ellipse x²A + y²B + xC + yD = 1 through boundary points. */
function fitEllipse(points) {
  const m = Array.from({ length: 4 }, () => new Float64Array(5));
  for (const [x, y] of points) {
    const row = [x * x, y * y, x, y];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) m[i][j] += row[i] * row[j];
      m[i][4] += row[i];
    }
  }
  for (let col = 0; col < 4; col++) {
    let pivot = col;
    for (let r = col + 1; r < 4; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    for (let r = 0; r < 4; r++) {
      if (r === col) continue;
      const factor = m[r][col] / m[col][col];
      for (let c = col; c < 5; c++) m[r][c] -= factor * m[col][c];
    }
  }
  const [A, B, C, D] = m.map((row, i) => row[4] / row[i]);
  const cx = -C / (2 * A);
  const cy = -D / (2 * B);
  const k = 1 + A * cx * cx + B * cy * cy;
  return { cx, cy, rx: Math.sqrt(k / A), ry: Math.sqrt(k / B) };
}

/** Closed uniform Catmull-Rom spline; global s = (segment + t) / segments. */
function sampleLoop(points, perSegment) {
  const n = points.length;
  const samples = [];
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [-1, 0, 1, 2].map((o) => points[(i + o + n) % n]);
    for (let j = 0; j < perSegment; j++) {
      const t = j / perSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const at = (c) =>
        0.5 *
        (2 * p1[c] +
          (-p0[c] + p2[c]) * t +
          (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 +
          (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3);
      samples.push({ u: at(0), v: at(1), z: p1[2] + (p2[2] - p1[2]) * t, s: (i + t) / n });
    }
  }
  return samples;
}

function rowExtents(mask, width, height) {
  const min = new Int32Array(height).fill(-1);
  const max = new Int32Array(height).fill(-1);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      if (min[y] < 0) min[y] = x;
      max[y] = x;
    }
  }
  return { min, max };
}

export async function exportSculptureMaps({
  source = 'design/assets/learning-loop.png',
  pathFile = 'src/data/loop-path.json',
  out = 'src/assets/learning-loop-maps.png',
  // Half resolution keeps the matte edge within ~1px of the rendered sculpture
  // for about 100 KB; a third is ~58 KB but visibly softer at desktop size.
  scale = 1 / 2,
} = {}) {
  const { data, info } = await sharp(source)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const count = W * H;

  // Backdrop: per-channel median of a 4px border, which is plain studio paper.
  const border = [[], [], []];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x >= 4 && y >= 4 && x < W - 4 && y < H - 4) continue;
      for (let c = 0; c < 3; c++) border[c].push(data[(y * W + x) * 3 + c]);
    }
  }
  const backdrop = border.map((values) => values.sort((a, b) => a - b)[values.length >> 1]);
  const background = new Uint8Array(count);
  for (let p = 0; p < count; p++) {
    let d = 0;
    for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(data[p * 3 + c] - backdrop[c]));
    background[p] = d <= BACKDROP_TOLERANCE ? 1 : 0;
  }

  // The border component is open backdrop; the two largest enclosed ones are the
  // loop openings. Everything else, including glass highlights that happen to
  // match the backdrop color, belongs to the sculpture or its floor glow.
  const { labels, sizes } = components(background, W, H);
  const outer = new Set();
  for (let x = 0; x < W; x++) outer.add(labels[x]).add(labels[(H - 1) * W + x]);
  for (let y = 0; y < H; y++) outer.add(labels[y * W]).add(labels[y * W + W - 1]);
  outer.delete(0); // 0 marks sculpture pixels, never a backdrop component
  const holes = sizes
    .map((size, id) => ({ id, size }))
    .filter(({ id }) => id > 0 && !outer.has(id))
    .sort((a, b) => b.size - a.size)
    .slice(0, 2)
    .map(({ id }) => id);
  const excluded = new Set([...outer, ...holes]);
  const silhouette = Uint8Array.from(labels, (id) => (excluded.has(id) ? 0 : 1));

  // The silhouette narrows toward the ceramic's floor contact and then widens
  // into the floor glow. That neck row separates sculpture from floor.
  const extents = rowExtents(silhouette, W, H);
  let top = 0;
  while (extents.min[top] < 0) top++;
  let bottom = H - 1;
  while (extents.min[bottom] < 0) bottom--;
  let neck = -1;
  let narrowest = Infinity;
  for (let y = Math.round(top + (bottom - top) * 0.8); y <= bottom; y++) {
    if (extents.min[y] < 0) continue;
    const span = extents.max[y] - extents.min[y];
    if (span < narrowest) {
      narrowest = span;
      neck = y;
    } else if (span > narrowest * 1.15) break;
  }
  const boundary = [];
  for (let y = neck - 160; y <= neck; y += 4)
    if (extents.min[y] >= 0) boundary.push([extents.min[y], y], [extents.max[y], y]);
  const base = fitEllipse(boundary);
  let body = Uint8Array.from(silhouette, (value, p) => {
    const x = p % W;
    const y = (p - x) / W;
    if (!value || y < neck - 4) return value;
    return ((x - base.cx) / base.rx) ** 2 + ((y - base.cy) / base.ry) ** 2 <= 1 ? 1 : 0;
  });
  // Closing seals bright glaze cracks that touch the backdrop tolerance at the
  // edge (channels under 8px); the 8's waists are far wider and stay concave.
  body = erode(dilate(body, W, H, 4), W, H, 4);
  body = dilate(erode(body, W, H, 2), W, H, 2);
  body = largestComponent(body, W, H);

  // Inflate the silhouette into a tube: h = sqrt(1 - (1 - d/R)^2), where R is the
  // local half-thickness found by spreading the distance field's ridge values.
  const distance = distanceField(invert(body), W, H);
  let maxDistance = 0;
  for (const d of distance) maxDistance = Math.max(maxDistance, d);
  const qw = Math.ceil(W / 4);
  const qh = Math.ceil(H / 4);
  const coarse = new Float64Array(qw * qh);
  for (let y = 0; y < qh; y++)
    for (let x = 0; x < qw; x++) coarse[y * qw + x] = distance[y * 4 * W + x * 4];
  const coarseRadius = maxFilter(coarse, qw, qh, Math.floor((2 * maxDistance) / 4 / 2));
  const radius = blur(
    Float64Array.from({ length: count }, (_, p) => {
      const x = p % W;
      return coarseRadius[Math.floor((p - x) / W / 4) * qw + Math.floor(x / 4)];
    }),
    W,
    H,
    8,
  );
  const height = blur(
    Float64Array.from({ length: count }, (_, p) => {
      if (!body[p]) return 0;
      const t = Math.min(1, distance[p] / Math.max(radius[p], 1));
      return Math.sqrt(Math.max(0, 1 - (1 - t) ** 2));
    }),
    W,
    H,
    2,
  );
  const matte = blur(Float64Array.from(body), W, H, 1.2);

  const ow = Math.round(W * scale);
  const oh = Math.round(H * scale);
  const matteOut = areaResample(matte, W, H, ow, oh);
  const heightOut = areaResample(height, W, H, ow, oh);

  // s is found per output pixel, never averaged, so it cannot blur across the
  // 1 -> 0 wrap. Where both strands overlap, the glass strand in front wins.
  const { points } = JSON.parse(await readFile(pathFile, 'utf8'));
  const samples = sampleLoop(points, SAMPLES_PER_SEGMENT).map((sample) => ({
    ...sample,
    x: sample.u * ow,
    y: sample.v * oh,
  }));
  const front = samples.filter((sample) => sample.z >= -0.25);
  const behind = samples.filter((sample) => sample.z < -0.25);
  const penalty = 0.12 * ow;
  const pixels = Buffer.alloc(ow * oh * 3);
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const nearest = (list) => {
        let best = null;
        let bestDistance = Infinity;
        for (const sample of list) {
          const d = (sample.x - x - 0.5) ** 2 + (sample.y - y - 0.5) ** 2;
          if (d < bestDistance) {
            bestDistance = d;
            best = sample;
          }
        }
        return { sample: best, distance: Math.sqrt(bestDistance) };
      };
      const a = nearest(front);
      const b = nearest(behind);
      const s = a.distance <= b.distance + penalty ? a.sample.s : b.sample.s;
      const p = y * ow + x;
      pixels[p * 3] = Math.round(Math.min(1, Math.max(0, matteOut[p])) * 255);
      pixels[p * 3 + 1] = Math.round(Math.min(1, Math.max(0, heightOut[p])) * 255);
      pixels[p * 3 + 2] = Math.round(s * 255);
    }
  }

  const png = await sharp(pixels, { raw: { width: ow, height: oh, channels: 3 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
    .toBuffer();
  if (out) {
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, png);
  }

  // Floor glow: what the neck/ellipse cut removed. Moments give a robust ellipse
  // (radius = 2σ for a uniformly filled ellipse) for placing shader caustics.
  let n = 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let syy = 0;
  let bx0 = W;
  let by0 = H;
  let bx1 = 0;
  let by1 = 0;
  for (let p = 0; p < count; p++) {
    const x = p % W;
    const y = (p - x) / W;
    if (body[p]) {
      bx0 = Math.min(bx0, x);
      by0 = Math.min(by0, y);
      bx1 = Math.max(bx1, x);
      by1 = Math.max(by1, y);
    }
    if (silhouette[p] && !body[p] && y >= neck - 4) {
      n++;
      sx += x;
      sy += y;
      sxx += x * x;
      syy += y * y;
    }
  }
  const fx = sx / n;
  const fy = sy / n;
  const round = (value) => Math.round(value * 10000) / 10000;
  const result = {
    width: ow,
    height: oh,
    bytes: png.length,
    backdrop,
    neck,
    base: {
      cx: round(base.cx / W),
      cy: round(base.cy / H),
      rx: round(base.rx / W),
      ry: round(base.ry / H),
    },
    floor: {
      cx: round(fx / W),
      cy: round(fy / H),
      rx: round((2 * Math.sqrt(sxx / n - fx * fx)) / W),
      ry: round((2 * Math.sqrt(syy / n - fy * fy)) / H),
    },
    bbox: { x0: round(bx0 / W), y0: round(by0 / H), x1: round(bx1 / W), y1: round(by1 / H) },
  };
  console.log(`Sculpture maps ${ow}×${oh}, ${png.length.toLocaleString()} bytes`, result);
  return result;
}
