/** Shared catalog contract, used by generation and tests. All links are trusted
 * repository content, but validation prevents a typo from breaking the shop. */
export const categories = {
  all: 'Everything',
  tees: 'Tees',
  dresses: 'Dresses',
  objects: 'Objects',
};

export function validateCatalog(products) {
  if (!Array.isArray(products) || products.length === 0) throw new Error('The catalog is empty.');
  const slugs = new Set();
  for (const product of products) {
    for (const key of ['slug', 'name', 'image', 'description', 'buyUrl', 'vendor', 'details']) {
      if (typeof product[key] !== 'string' || !product[key].trim())
        throw new Error(`Missing ${key}: ${product.slug}`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug) || slugs.has(product.slug))
      throw new Error(`Invalid or duplicate slug: ${product.slug}`);
    slugs.add(product.slug);
    if (!['tees', 'dresses', 'objects'].includes(product.category))
      throw new Error(`Unknown category: ${product.slug}`);
    const url = new URL(product.buyUrl);
    const vendorHosts = { Zazzle: 'www.zazzle.com', Redbubble: 'www.redbubble.com' };
    if (url.protocol !== 'https:' || url.hostname !== vendorHosts[product.vendor])
      throw new Error(`Invalid purchase URL: ${product.slug}`);
    for (const image of [product.image, ...product.gallery.map((item) => item.image)]) {
      if (!image.startsWith('/assets/products/') || image.includes('..'))
        throw new Error(`Invalid image path: ${product.slug}`);
    }
  }
  return products;
}

export const productPath = ({ slug }) => `/merch/${slug}/`;
export const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

/** Never embed a raw JSON string in HTML: </script> also terminates JSON-LD. */
export const scriptJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
