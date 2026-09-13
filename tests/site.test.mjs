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
  assert.ok(home.includes('For humans. For AI.'));
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
