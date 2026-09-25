import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateCatalog, scriptJson, productPath } from '../src/catalog.mjs';
import { homePage, merchPage, productPage, redirectPage } from '../src/pages.mjs';
const products = JSON.parse(readFileSync(new URL('../src/data/products.json', import.meta.url)));

test('all legacy products, buy destinations, and content survive migration', () => {
  assert.equal(validateCatalog(products).length, 11);
  assert.deepEqual(
    products.map((p) => p.slug),
    [
      'impossible-cup',
      'et-al',
      'mondrian-world-map',
      'nesterov-optimize',
      'legalize-math-beauty',
      'legalize-math-truth',
      'legalize-math-charm',
      'celestial-glaze',
      'peach-blossom-cave-glaze',
      'borromean-harmony',
      'echoes-of-light',
    ],
  );
  assert.equal(products.filter((p) => p.vendor === 'Zazzle').length, 2);
  assert.equal(products.filter((p) => p.vendor === 'Redbubble').length, 9);
  for (const product of products) assert.ok(productPage(product).includes(product.buyUrl));
});

test('catalog validation rejects unsafe URLs, duplicate routes, and missing assets', () => {
  assert.throws(() => validateCatalog([{ ...products[0], buyUrl: 'javascript:alert(1)' }]));
  assert.throws(() => validateCatalog([products[0], products[0]]));
  assert.throws(() => validateCatalog([{ ...products[0], image: '/assets/products/../secret' }]));
  assert.throws(() => validateCatalog([{ ...products[0], category: 'unknown' }]));
});

test('HTML and metadata escape future product input and script-closing payloads', () => {
  const page = productPage({
    ...products[0],
    name: '<img onerror="x">',
    description: '</script><script>alert(1)</script>',
  });
  assert.ok(page.includes('&lt;img onerror=&quot;x&quot;&gt;'));
  assert.ok(!page.includes('<script>alert(1)'));
  assert.equal(JSON.parse(scriptJson({ name: '</script>' })).name, '</script>');
});

test('the landing and catalog have complete content without JavaScript', () => {
  const home = homePage();
  assert.ok(home.includes('<h1>'));
  assert.match(home, /class="hero-subtitle">For humans\. For AI\.<\/p>/);
  assert.match(home, /class="footer-note">A billion small brains .*one giga brain<\/p>/);
  assert.ok(home.includes('<em>Upgraded.</em>'));
  assert.ok(home.includes('<span>guni.ai</span>'));
  assert.ok(!home.includes('motion-controls'));
  assert.ok(home.includes('href="https://shital.com"'));
  assert.ok(home.includes('href="/merch/"'));
  assert.ok(home.includes('rel="canonical" href="https://guni.ai/"'));
  assert.ok(!/Seattle|LLC|gunis\.ai|googletagmanager/i.test(home));
  const catalog = merchPage(products);
  for (const product of products) assert.ok(catalog.includes(`href="${productPath(product)}"`));
  assert.equal((catalog.match(/class="product-card"/g) ?? []).length, 11);
});

test('legacy redirects have a canonical destination and usable fallback link', () => {
  for (const product of products) {
    const html = redirectPage(productPath(product), product.name);
    assert.ok(html.includes(`content="0;url=https://guni.ai${productPath(product)}"`));
    assert.ok(html.includes('noindex,follow'));
    assert.ok(html.includes('<a href='));
  }
});

test('presentation work leaves the landing copy, links and accessible names unchanged', () => {
  const body = homePage().slice(homePage().indexOf('<body'));
  const text = body
    .replace(/<[^>]+>/g, ' ')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  assert.equal(
    text,
    'Skip to content guni.ai Say hello (opens in a new tab) Learning Upgraded. For humans. For AI. Coming soon A little curiosity guni.ai A billion small brains > one giga brain Merch',
  );
  assert.deepEqual(
    [...body.matchAll(/<a [^>]*href="([^"]+)"/g)].map((match) => match[1]),
    ['#main', '/', 'https://shital.com', '/', '/merch/'],
  );
  assert.deepEqual(
    [...body.matchAll(/(?:aria-label|alt)="([^"]+)"/g)].map((match) => match[1]),
    [
      'guni.ai home',
      'Two interlocking loops of ivory ceramic and prismatic glass, a symbol of shared learning.',
      'Explore the learning loop. Move your pointer or touch to bend the light. Use arrow keys to explore, Enter to send a ripple, or Escape to settle the motion.',
    ],
  );
});

test('the sculpture maps stay an exact RGB data texture aligned to the artwork', async () => {
  const { default: sharp } = await import('sharp');
  const maps = await sharp('src/assets/learning-loop-maps.png').metadata();
  const art = await sharp('public/assets/brand/learning-loop.webp').metadata();
  // An alpha channel would let browsers premultiply away the packed data.
  assert.equal(maps.channels, 3);
  assert.ok(!maps.hasAlpha);
  assert.ok(Math.abs(maps.width / maps.height - art.width / art.height) < 0.002);
  const path = JSON.parse(readFileSync(new URL('../src/data/loop-path.json', import.meta.url)));
  assert.ok(path.points.length >= 8);
  for (const [x, y, z] of path.points) {
    assert.ok(x > 0 && x < 1 && y > 0 && y < 1 && z >= -1 && z <= 1);
  }
});
