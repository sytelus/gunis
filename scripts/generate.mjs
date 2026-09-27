import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { validateCatalog, productPath } from '../src/catalog.mjs';
import { productPalette } from './palette.mjs';
import {
  SITE,
  homePage,
  aboutPage,
  contactPage,
  privacyPage,
  merchPage,
  productPage,
  notFoundPage,
  redirectPage,
} from '../src/pages.mjs';

const products = validateCatalog(
  JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url), 'utf8')),
);
const root = resolve(import.meta.dirname, '..');
async function write(path, content) {
  const output = resolve(root, path);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, content);
}
for (const p of products) {
  for (const image of [p.image, ...p.gallery.map((item) => item.image)])
    await access(resolve(root, 'public' + image));
  // The merch lamp takes on each product's colours (scripts/palette.mjs).
  p.palette = await productPalette(resolve(root, 'public' + p.image));
}
await write('index.html', homePage());
await write('merch/index.html', merchPage(products));
await write('404.html', notFoundPage());
await write('portfolio/index.html', redirectPage('/merch/', 'Explore the curiosities'));
await write('about/index.html', aboutPage());
await write('contact/index.html', contactPage());
await write('privacy/index.html', privacyPage());
for (const product of products) {
  await write(`merch/${product.slug}/index.html`, productPage(product));
  await write(
    `portfolio/${product.slug}/index.html`,
    redirectPage(productPath(product), product.name),
  );
}
const paths = ['/', '/about/', '/contact/', '/privacy/', '/merch/', ...products.map(productPath)];
await write(
  'public/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${SITE}${path}</loc></url>`).join('')}</urlset>`,
);
await write('public/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`Generated ${paths.length} canonical pages, legacy redirects, sitemap, and 404.`);
