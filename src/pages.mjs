import MarkdownIt from 'markdown-it';
import { categories, escapeHtml as e, productPath, scriptJson } from './catalog.mjs';

export const SITE = 'https://guni.ai';
export const CONTACT = 'https://shital.com';
const markdown = new MarkdownIt({ html: false, linkify: false });
const icon = (name, extra = '') =>
  `<img class="icon ${extra}" src="/icons/${name}.svg" alt="" width="20" height="20" aria-hidden="true">`;
const external = (url, text, css = '') =>
  `<a class="text-link ${css}" href="${e(url)}" target="_blank" rel="noopener noreferrer">${text}${icon('arrow-up-right')}<span class="sr-only"> (opens in a new tab)</span></a>`;

export function header() {
  return `<header class="site-header"><a class="brand" href="/" aria-label="guni.ai home"><img class="brand-mark" src="/assets/brand/guni-mark.png" alt="" width="70" height="70"><span>guni.ai</span></a>${external(CONTACT, 'Say hello')}</header>`;
}

function footer(home = false) {
  return `<footer class="site-footer"><a class="domain" href="/">guni.ai</a><p class="footer-note">A billion small brains <span class="tagline-comparison">&gt;</span> one giga brain</p>${home ? `<a class="text-link side-quest" href="/merch/">Merch ${icon('arrow-up-right')}</a>` : `<a class="text-link" href="/">Back to the beginning ${icon('arrow-up-left')}</a>`}</footer>`;
}

/** HTML is rendered at build time so crawlers and JS-disabled browsers receive
 * the complete page. The client only enhances motion and catalog controls. */
export function documentPage({
  title,
  description,
  path,
  body,
  className = '',
  schema,
  noindex = false,
  preloadHero = false,
}) {
  return `<!doctype html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${e(title)}</title><meta name="description" content="${e(description)}">
<link rel="canonical" href="${SITE}${path}"><meta name="theme-color" content="#f7f5f1">
${noindex ? '<meta name="robots" content="noindex,follow">' : '<meta name="robots" content="index,follow,max-image-preview:large">'}
<meta property="og:type" content="website"><meta property="og:site_name" content="Guni">
<meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${SITE}/assets/brand/social-cover.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Guni — interlocking ivory and prismatic glass loops, a symbol of shared learning.">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${e(title)}"><meta name="twitter:description" content="${e(description)}"><meta name="twitter:image" content="${SITE}/assets/brand/social-cover.jpg">
<link rel="icon" href="/favicon.png" type="image/png"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/fonts/instrument-sans.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/fonts/instrument-serif-italic.woff2" as="font" type="font/woff2" crossorigin>
${preloadHero ? '<link rel="preload" as="image" href="/assets/brand/learning-loop.webp" fetchpriority="high">' : ''}
<script type="application/ld+json">${scriptJson(schema ?? { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: SITE + path })}</script>
<script type="module" src="/src/main.ts"></script><link rel="stylesheet" href="/src/styles.css">
</head><body class="${className}"><a class="skip-link" href="#main">Skip to content</a>${body}</body></html>`;
}

export function homePage() {
  const body = `<div class="home-shell">${header()}<main id="main" class="home-hero">
<div class="hero-copy"><h1><span class="headline-sans">Learning</span><em>Upgraded.</em></h1><p class="hero-subtitle">For humans. For AI.</p><p class="launch-status"><span aria-hidden="true"></span>Coming soon</p></div>
<div class="artwork" data-artwork>
<img class="artwork-image" src="/assets/brand/learning-loop.webp" width="1122" height="1402" alt="Two interlocking loops of ivory ceramic and prismatic glass, a symbol of shared learning." fetchpriority="high" decoding="async">
<canvas class="artwork-canvas" aria-hidden="true"></canvas>
<button class="artwork-touch" type="button" aria-label="Explore the learning loop. Move your pointer or touch to bend the light. Use arrow keys to explore, Enter to send a ripple, or Escape to settle the motion." aria-describedby="artwork-hint" hidden></button>
</div>
<div class="artwork-hint" id="artwork-hint" hidden><span class="hint-text">A little curiosity</span>${icon('arrows-horizontal')}</div>
<span class="sr-only" data-artwork-announcement aria-live="polite"></span>
</main>${footer(true)}</div>`;
  return documentPage({
    title: 'guni.ai — Learning Upgraded',
    description:
      'A billion small brains > one giga brain. Advancing learning technologies for humans and AI. Coming soon from guni.ai.',
    path: '/',
    body,
    className: 'page-home',
    preloadHero: true,
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${SITE}/#organization`,
          name: 'Guni',
          url: SITE,
          logo: `${SITE}/assets/brand/guni-mark.png`,
          description: 'Advancing learning technologies for humans and AI.',
        },
        {
          '@type': 'WebSite',
          '@id': `${SITE}/#website`,
          name: 'Guni',
          url: SITE,
          publisher: { '@id': `${SITE}/#organization` },
          inLanguage: 'en',
        },
        {
          '@type': 'WebPage',
          name: 'Learning Upgraded',
          url: `${SITE}/`,
          isPartOf: { '@id': `${SITE}/#website` },
          about: { '@id': `${SITE}/#organization` },
        },
      ],
    },
  });
}

function productCard(product, index) {
  return `<article class="product-card" data-category="${product.category}" data-slug="${product.slug}"><a class="product-art" href="${productPath(product)}"><img src="${e(product.image)}" alt="${e(product.name)}" width="600" height="750" loading="${index < 3 ? 'eager' : 'lazy'}" decoding="async"><span class="product-discover">Take a closer look ${icon('arrow-up-right')}</span></a><div class="product-meta"><span>${categories[product.category]}</span><span>${String(index + 1).padStart(2, '0')}</span></div><h2><a href="${productPath(product)}">${e(product.name)}</a></h2><p class="product-description">${e(product.description)}</p>${external(product.buyUrl, 'Buy on ' + product.vendor, 'buy-link')}</article>`;
}

export function merchPage(products) {
  return documentPage({
    title: 'Side quests — Guni merch',
    description:
      'A few things for curious minds. Explore the Guni collection of mathematics, art, and science-inspired tees, dresses, and objects.',
    path: '/merch/',
    className: 'page-merch',
    body: `<div class="content-shell">${header()}<main id="main"><section class="merch-intro"><a class="eyebrow text-link" href="/">${icon('arrow-up-left')}A small detour</a><h1>Serious curiosity.<br><em>Playful things.</em></h1><p>A few things for minds that wander.</p></section><div class="catalog-toolbar" hidden><div class="filter-group" role="group" aria-label="Filter merchandise">${Object.entries(
      categories,
    )
      .map(
        ([key, value]) =>
          `<button class="filter-button" type="button" data-filter="${key}" aria-pressed="${key === 'all'}">${value}</button>`,
      )
      .join(
        '',
      )}</div><button class="text-button shuffle-button" type="button">${icon('shuffle')}Surprise me</button></div><p class="catalog-count" aria-live="polite"><span data-count>${products.length}</span> things to discover</p><div class="product-grid">${products.map(productCard).join('')}</div><p class="shop-note">Made and shipped through Redbubble and Zazzle.<br>Choose your size, see current prices, and check out with them.</p></main>${footer()}</div>`,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Guni Side Quests',
      url: `${SITE}/merch/`,
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: products.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: SITE + productPath(p),
          name: p.name,
        })),
      },
    },
  });
}

export function productPage(product) {
  const images = [{ image: product.image, alt: product.name }, ...product.gallery];
  return documentPage({
    title: `${product.name} — Guni Side Quests`,
    description: product.description,
    path: productPath(product),
    className: 'page-product',
    body: `<div class="content-shell">${header()}<main id="main"><a class="text-link back-link" href="/merch/">${icon('arrow-left')}Back to the curiosities</a><article class="product-detail"><div class="product-gallery"><img class="gallery-main" src="${e(product.image)}" alt="${e(product.name)}" width="600" height="750" fetchpriority="high" data-gallery-main>${images.length > 1 ? `<div class="gallery-thumbnails">${images.map((item, i) => `<a href="${e(item.image)}" class="gallery-thumbnail" data-gallery-src="${e(item.image)}" data-gallery-alt="${e(item.alt)}" aria-label="View ${e(item.alt)}" ${i === 0 ? 'aria-current="true"' : ''}><img src="${e(item.image)}" alt="" width="90" height="110" loading="lazy"></a>`).join('')}</div>` : ''}</div><div class="product-story"><p class="eyebrow">Side quests <span class="slash">/</span> ${categories[product.category]}</p><h1>${e(product.name)}</h1><p class="product-lead">${e(product.description)}</p>${external(product.buyUrl, 'Buy on ' + product.vendor, 'purchase-button')}<p class="purchase-note">Prices, options, shipping, and checkout at ${e(product.vendor)}.</p><details class="product-specs"><summary>The details ${icon('plus')}</summary><div class="prose">${markdown.render(product.details)}</div></details></div></article><aside class="product-outro"><p>Curiosity looks good on you.</p><a class="text-link" href="/merch/">Keep exploring ${icon('arrow-right')}</a></aside></main>${footer()}</div>`,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: images.map((item) => SITE + item.image),
      url: SITE + productPath(product),
      brand: { '@type': 'Brand', name: 'Guni' },
      potentialAction: { '@type': 'BuyAction', target: product.buyUrl },
    },
  });
}

/** Pages cannot issue arbitrary HTTP 301s. Use a canonical, noindex HTML
 * redirect with a real fallback link; never route every 404 to the homepage. */
export function redirectPage(destination, label) {
  const target = new URL(destination, SITE).href;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(label)} — Guni</title><meta name="robots" content="noindex,follow"><link rel="canonical" href="${e(target)}"><meta http-equiv="refresh" content="0;url=${e(target)}"></head><body><p>This page has moved. <a href="${e(target)}">${e(label)}</a>.</p></body></html>`;
}

export function notFoundPage() {
  return documentPage({
    title: 'A little off the path — Guni',
    description: 'This page is not here. Find your way back to Guni.',
    path: '/404.html',
    noindex: true,
    body: `<div class="content-shell">${header()}<main id="main" class="not-found"><p class="eyebrow">404 / Uncharted territory</p><h1>Curiosity takes you places.<br><em>Just not this one.</em></h1><a class="text-link" href="/">Back to the beginning ${icon('arrow-right')}</a></main>${footer()}</div>`,
  });
}
