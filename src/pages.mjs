import MarkdownIt from 'markdown-it';
import { categories, escapeHtml as e, productPath, scriptJson } from './catalog.mjs';

export const SITE = 'https://guni.ai';
/** The legal operator of guni.ai. Public-record facts only (Washington
 * Secretary of State); no street address or phone is published. */
export const COMPANY = {
  legalName: 'Gunis LLC',
  // Exactly as registered with the State of Washington and on the D-U-N-S
  // record; Apple matches the website against it.
  registeredName: 'GUNIS LLC',
  kind: 'a Washington limited liability company',
  founded: '2025',
  foundingDate: '2025-03-05',
  locality: 'Sammamish',
  region: 'Washington',
  regionCode: 'WA',
  country: 'USA',
  founder: 'Shital Shah',
  founderSite: 'https://shital.com',
  email: 'shital@guni.ai',
};
export const CONTACT = '/contact/';
const YEAR = new Date().getFullYear();
const mail = (css = '') =>
  `<a class="text-link ${css}" href="mailto:${COMPANY.email}">${COMPANY.email}${icon('arrow-up-right')}</a>`;
const markdown = new MarkdownIt({ html: false, linkify: false });
const icon = (name, extra = '') =>
  `<img class="icon ${extra}" src="/icons/${name}.svg" alt="" width="20" height="20" aria-hidden="true">`;
const external = (url, text, css = '') =>
  `<a class="text-link ${css}" href="${e(url)}" target="_blank" rel="noopener noreferrer">${text}${icon('arrow-up-right')}<span class="sr-only"> (opens in a new tab)</span></a>`;

export function header() {
  return `<header class="site-header"><a class="brand" href="/" aria-label="guni.ai home"><img class="brand-mark" src="/assets/brand/guni-mark.png" alt="" width="70" height="70"><span>guni.ai</span></a><nav class="site-nav" aria-label="Primary"><a class="nav-link nav-work" href="/#work">Our work</a><a class="nav-link" href="/about/">About</a><a class="text-link" href="${CONTACT}">Say hello${icon('arrow-up-right')}</a></nav></header>`;
}

/** Company identification, on every page. */
function legal() {
  return `<div class="site-legal"><p>© ${YEAR} ${COMPANY.registeredName}. guni.ai is operated by ${COMPANY.registeredName}, ${COMPANY.kind}.</p><nav aria-label="Company"><a href="/about/">About</a><a href="/contact/">Contact</a><a href="/privacy/">Privacy</a><a href="/merch/">Merch</a></nav></div>`;
}

function footer(home = false) {
  return `<footer class="site-footer"><div class="footer-row"><a class="domain" href="/">guni.ai</a><p class="footer-note">A billion small brains <span class="tagline-comparison">&gt;</span> one giga brain</p>${home ? `<a class="text-link side-quest" href="/merch/">Merch ${icon('arrow-up-right')}</a>` : `<a class="text-link" href="/">Back to the beginning ${icon('arrow-up-left')}</a>`}</div>${legal()}</footer>`;
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
<div class="hero-copy"><h1><span class="headline-sans">Learning</span><em>Upgraded.</em></h1><p class="hero-subtitle">For humans. For AI.</p><p class="launch-status"><span aria-hidden="true"></span>First apps in development</p></div>
<div class="artwork" data-artwork>
<img class="artwork-image" src="/assets/brand/learning-loop.webp" width="1122" height="1402" alt="Two interlocking loops of ivory ceramic and prismatic glass, a symbol of shared learning." fetchpriority="high" decoding="async">
<button class="artwork-touch" type="button" aria-label="Explore the learning loop. Move your pointer or touch to bend the light. Use arrow keys to explore, Enter to send a ripple, or Escape to settle the motion." aria-describedby="artwork-hint" hidden></button>
</div>
<div class="artwork-hint" id="artwork-hint" hidden><span class="hint-text">A little curiosity</span>${icon('arrows-horizontal')}</div>
<span class="sr-only" data-artwork-announcement aria-live="polite"></span>
</main><div class="hero-bar"><a class="domain" href="/">guni.ai</a><p class="footer-note">A billion small brains <span class="tagline-comparison">&gt;</span> one giga brain</p><a class="text-link side-quest" href="/merch/">Merch ${icon('arrow-up-right')}</a></div></div>
<div class="content-shell company">
<section class="company-section" id="work" aria-labelledby="work-title">
<p class="eyebrow">Our work</p>
<h2 id="work-title">Learning, <em>deeper and faster.</em></h2>
<div class="company-lede"><p>guni.ai is the studio of ${COMPANY.legalName}. We invent new learning methods and build them into games and apps that help people learn faster, understand more deeply and remember for longer.</p><p>We start with people. In time, what we discover about how humans learn best may also help machines learn more efficiently.</p></div>
<div class="projects">
<article class="project"><p class="project-meta"><span class="status-dot" aria-hidden="true"></span>iPhone and iPad · In development</p><h3>Geometry puzzle games</h3><p>Hands-on puzzles where shapes turn, fold and fit together. Each one is designed so that solving it builds real geometric intuition: no lectures, no quizzes, just the pleasure of seeing it click.</p></article>
<article class="project"><p class="project-meta"><span class="status-dot" aria-hidden="true"></span>iPhone and iPad · In development</p><h3>A math learning app</h3><p>Interactive lessons that adapt to each learner and turn abstract ideas into things you can see, move and test, so understanding comes first and speed follows.</p></article>
</div>
<p class="company-note">Our apps are in development and not yet available on the App Store. The sculpture at the top of this page is a small taste of the play we build. Touch it.</p>
</section>
<section class="company-section company-about" aria-labelledby="about-title">
<p class="eyebrow">About</p>
<h2 id="about-title">A small company <em>with a big question.</em></h2>
<div class="company-lede"><p>${COMPANY.legalName} is an independent software company based in ${COMPANY.locality}, ${COMPANY.region}, founded in ${COMPANY.founded} by ${COMPANY.founder}. Our question: how much faster, deeper and more joyfully could everyone learn with the right tools?</p></div>
<a class="text-link" href="/about/">More about us ${icon('arrow-right')}</a>
</section>
<section class="company-section company-contact" aria-labelledby="contact-title">
<p class="eyebrow">Contact</p>
<h2 id="contact-title">Say hello.</h2>
<div class="company-lede"><p>For questions about our work, collaborations or partnerships, write to us.</p></div>
${mail('contact-mail')}
</section>
</div>
<div class="content-shell">${footer(true)}</div>`;
  return documentPage({
    title: 'guni.ai — Learning Upgraded',
    description:
      'guni.ai, by Gunis LLC, builds games and apps that help people learn faster, understand more deeply and remember longer. First iPhone and iPad apps in development.',
    path: '/',
    body,
    className: 'page-home',
    preloadHero: true,
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        organization(),
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

/** Presentation hooks only: the product's light colours for the merch lamp,
 * and a shared view-transition name so its photo morphs between pages. */
const glow = (product) =>
  product.palette
    ? ` style="--glow:${e(product.palette[0])};--glow2:${e(product.palette[1])}"`
    : '';
const morph = (product) => ` style="view-transition-name:product-${product.slug}"`;

function productCard(product, index) {
  return `<article class="product-card" data-category="${product.category}" data-slug="${product.slug}"${glow(product)}><a class="product-art" href="${productPath(product)}"><img src="${e(product.image)}" alt="${e(product.name)}" width="600" height="750" loading="${index < 3 ? 'eager' : 'lazy'}" decoding="async"${morph(product)}><span class="product-discover">Take a closer look ${icon('arrow-up-right')}</span></a><div class="product-meta"><span>${categories[product.category]}</span><span>${String(index + 1).padStart(2, '0')}</span></div><h2><a href="${productPath(product)}">${e(product.name)}</a></h2><p class="product-description">${e(product.description)}</p>${external(product.buyUrl, 'Buy on ' + product.vendor, 'buy-link')}</article>`;
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
    body: `<div class="content-shell">${header()}<main id="main"><a class="text-link back-link" href="/merch/">${icon('arrow-left')}Back to the curiosities</a><article class="product-detail"${glow(product)}><div class="product-gallery"><img class="gallery-main" src="${e(product.image)}" alt="${e(product.name)}" width="600" height="750" fetchpriority="high" data-gallery-main${morph(product)}>${images.length > 1 ? `<div class="gallery-thumbnails">${images.map((item, i) => `<a href="${e(item.image)}" class="gallery-thumbnail" data-gallery-src="${e(item.image)}" data-gallery-alt="${e(item.alt)}" aria-label="View ${e(item.alt)}" ${i === 0 ? 'aria-current="true"' : ''}><img src="${e(item.image)}" alt="" width="90" height="110" loading="lazy"></a>`).join('')}</div>` : ''}</div><div class="product-story"><p class="eyebrow">Side quests <span class="slash">/</span> ${categories[product.category]}</p><h1>${e(product.name)}</h1><p class="product-lead">${e(product.description)}</p>${external(product.buyUrl, 'Buy on ' + product.vendor, 'purchase-button')}<p class="purchase-note">Prices, options, shipping, and checkout at ${e(product.vendor)}.</p><details class="product-specs"><summary>The details ${icon('plus')}</summary><div class="prose">${markdown.render(product.details)}</div></details></div></article><aside class="product-outro"><p>Curiosity looks good on you.</p><a class="text-link" href="/merch/">Keep exploring ${icon('arrow-right')}</a></aside></main>${footer()}</div>`,
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

/** Structured data naming the legal operator, used on the homepage and the
 * company pages. */
function organization() {
  return {
    '@type': 'Organization',
    '@id': `${SITE}/#organization`,
    name: 'guni.ai',
    alternateName: 'Guni',
    legalName: COMPANY.registeredName,
    url: SITE,
    logo: `${SITE}/assets/brand/guni-mark.png`,
    email: COMPANY.email,
    foundingDate: COMPANY.foundingDate,
    founder: { '@type': 'Person', name: COMPANY.founder, url: COMPANY.founderSite },
    address: {
      '@type': 'PostalAddress',
      addressLocality: COMPANY.locality,
      addressRegion: COMPANY.regionCode,
      addressCountry: 'US',
    },
    description:
      'Gunis LLC builds games and apps that help people learn faster, understand more deeply and remember longer.',
  };
}

/** Shared layout for About, Contact and Privacy: the site's editorial style. */
function companyPage({ title, description, path, eyebrow, heading, body }) {
  return documentPage({
    title,
    description,
    path,
    className: 'page-company',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        organization(),
        {
          '@type': 'WebPage',
          name: title,
          url: SITE + path,
          about: { '@id': `${SITE}/#organization` },
        },
      ],
    },
    body: `<div class="content-shell">${header()}<main id="main" class="company-page"><section class="company-intro"><p class="eyebrow">${eyebrow}</p><h1>${heading}</h1></section><div class="prose company-prose">${body}</div></main>${footer()}</div>`,
  });
}

export function aboutPage() {
  return companyPage({
    title: 'About — guni.ai by Gunis LLC',
    description:
      'Gunis LLC is an independent software company in Sammamish, Washington, building games and apps that help people learn faster and more deeply.',
    path: '/about/',
    eyebrow: 'About',
    heading: 'Learning, <em>upgraded.</em>',
    body: `<p class="company-lead">guni.ai is the studio of ${COMPANY.legalName}, an independent software company founded in ${COMPANY.founded} by ${COMPANY.founder}. We invent new learning methods and build them into games and apps that help people learn faster, understand more deeply and remember for longer.</p>
<h2>What we believe</h2>
<p>A billion small brains &gt; one giga brain. The biggest leap in human progress will not come from a single giant machine, but from helping every person learn a little better, every day. We design for that: learning that feels like play, and understanding that lasts.</p>
<h2>What we are building</h2>
<p>Our first products are for iPhone and iPad. <strong>Geometry puzzle games</strong> turn shapes into hands-on puzzles, so that every solution builds real spatial intuition. <strong>A math learning app</strong> follows, with interactive lessons that adapt to each learner. Both are in development and not yet available on the App Store.</p>
<p>Behind them is longer-term research: new algorithms that make learning more efficient and robust. We start with people. In time, the same ideas may help machines learn more efficiently too.</p>
<h2>The company</h2>
<dl class="facts">
<dt>Legal name</dt><dd>${COMPANY.registeredName}</dd>
<dt>Organization</dt><dd>Limited liability company, registered in the State of ${COMPANY.region}</dd>
<dt>Founded</dt><dd>March ${COMPANY.founded}</dd>
<dt>Location</dt><dd>${COMPANY.locality}, ${COMPANY.region}, ${COMPANY.country}</dd>
<dt>Founder</dt><dd>${COMPANY.founder} (<a href="${COMPANY.founderSite}" target="_blank" rel="noopener noreferrer">shital.com<span class="sr-only"> (opens in a new tab)</span></a>)</dd>
<dt>Brand</dt><dd>guni.ai (also reachable at gunis.ai)</dd>
<dt>Contact</dt><dd><a href="mailto:${COMPANY.email}">${COMPANY.email}</a></dd>
</dl>
<p>Between apps, we also make a few <a href="/merch/">curious things to wear and use</a>, sold through Redbubble and Zazzle.</p>`,
  });
}

export function contactPage() {
  return companyPage({
    title: 'Contact and support — guni.ai by Gunis LLC',
    description: 'Contact and support for guni.ai, operated by GUNIS LLC.',
    path: '/contact/',
    eyebrow: 'Contact',
    heading: 'Say <em>hello.</em>',
    body: `<p class="company-lead">For support, questions about our work, collaborations, partnerships, press or merchandise, email us. We read every message.</p>
<p class="contact-mail">${mail()}</p>
<dl class="facts">
<dt>Company</dt><dd>${COMPANY.registeredName} (operator of guni.ai)</dd>
<dt>Email</dt><dd><a href="mailto:${COMPANY.email}">${COMPANY.email}</a></dd>
<dt>Location</dt><dd>${COMPANY.locality}, ${COMPANY.region}, ${COMPANY.country}</dd>
<dt>Founder</dt><dd>${COMPANY.founder}</dd>
</dl>
<p>For orders of our merchandise, the seller (Redbubble or Zazzle) handles payment, delivery and returns; we are happy to help you reach them.</p>`,
  });
}

export function privacyPage() {
  return companyPage({
    title: 'Privacy — guni.ai by Gunis LLC',
    description: 'How the guni.ai website, operated by Gunis LLC, handles information.',
    path: '/privacy/',
    eyebrow: 'Privacy',
    heading: 'Privacy, <em>plainly.</em>',
    body: `<p class="company-lead">This notice explains how the guni.ai website, operated by ${COMPANY.legalName}, handles information. It covers this website only. Our apps will have their own privacy policies when they are released.</p>
<p class="updated">Effective September 27, 2026</p>
<h2>What we collect</h2>
<p>This website has no accounts, forms, advertising or analytics, and it sets no cookies. Its animations run entirely in your browser: pointer movement, touch and, where you allow it, device tilt are used there to animate the page and are never sent to us.</p>
<h2>Hosting</h2>
<p>The site is hosted by GitHub Pages. Like any web host, GitHub receives technical information when your browser requests a page, such as your IP address, and may keep it for security and operations under the <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">GitHub Privacy Statement<span class="sr-only"> (opens in a new tab)</span></a>. We do not receive visitor logs from GitHub.</p>
<h2>Email</h2>
<p>If you email us, we receive your address and your message and use them only to reply and keep a record of our conversation. Our email is provided by Google Workspace. We do not sell or share your information, and we delete correspondence on request.</p>
<h2>Merchandise</h2>
<p>Our merchandise is sold by Redbubble and Zazzle. When you follow a link to them, their own privacy policies and terms apply to anything you do there; we do not receive your payment details.</p>
<h2>Children</h2>
<p>This website collects no personal information from anyone, including children.</p>
<h2>Changes and questions</h2>
<p>If this notice changes, we will update it here with a new effective date. For any question or request about your information, contact ${COMPANY.legalName} at <a href="mailto:${COMPANY.email}">${COMPANY.email}</a>.</p>`,
  });
}
