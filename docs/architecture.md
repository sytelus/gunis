# Architecture

## Static first

`scripts/generate.mjs` reads and validates the product catalog, invokes the templates in `src/pages.mjs`, and writes HTML. Vite treats each route as an independent HTML entry, bundles the shared CSS and TypeScript, and copies `public/` to `dist/`. GitHub Pages serves only that output; Node runs at build time.

The site deliberately avoids a client router and runtime framework. A crawler or visitor with JavaScript disabled receives the actual headings, descriptions, images, product galleries, purchase links and navigation. Optional controls start hidden so unavailable JavaScript never leaves misleading buttons.

| Route                | Behavior                                                     |
| -------------------- | ------------------------------------------------------------ |
| `/`                  | Coming-soon landing page and interactive artwork             |
| `/merch/`            | All products, optional category filters and shuffle          |
| `/merch/<slug>/`     | Product description, gallery, vendor link and specifications |
| `/portfolio/`        | HTML redirect to `/merch/`                                   |
| `/portfolio/<slug>/` | HTML redirect to the corresponding new product               |
| `/about/`            | HTML redirect to the landing page                            |
| `/contact/`          | HTML redirect to https://shital.com                          |
| `/404.html`          | An actual missing-page experience, not an SPA catch-all      |

With the migrated catalog, the output contains 13 canonical content pages, 14 legacy redirects and a 404 page. GitHub Pages does not offer arbitrary server-side redirect rules. Legacy HTML therefore uses an immediate meta refresh, a canonical URL, `noindex,follow`, and a normal fallback link. Domain-level redirects are outside this repository.

## Content boundaries

`src/data/products.json` is trusted, version-controlled editorial content. `validateCatalog` checks required fields, unique route-safe slugs, known categories, local image paths and exact HTTPS vendor hosts. Generation checks that all referenced product images exist.

All interpolated user-visible values are HTML escaped. JSON-LD escapes `<` so future copy cannot terminate a script element. Product specifications are Markdown rendered by Markdown-it with raw HTML disabled. The current schema includes Product metadata and a BuyAction; it does not claim prices, stock, ratings or delivery times that this site does not control.

## Artwork pipeline

The sculpture is an authored image, not a fully rotatable 3D mesh. `src/artwork.ts` adds image-based refraction and parallax using one texture, one triangle strip and one draw call. Its small shader moves samples according to a luminance-derived depth proxy, adds slight chromatic separation, and sends a decaying ripple from interaction coordinates.

1. The normal WebP image is immediately visible and has meaningful alt text.
2. After idle time, the graphics module loads and waits for the image to decode.
3. If WebGL initializes, the canvas uses the same asset with the enhancement.
4. If WebGL is missing or fails, the image remains and responds with restrained perspective and color changes.
5. If a context is lost, the image fallback returns. Restored contexts can resume enhancement.

The browser chooses its adapter, including Apple GPU-backed implementations where available. The code does not infer the GPU from the operating system, inspect renderer identity, or require WebGPU. The effect is designed to be subtle and preserve the artwork's studio-rendered appearance.

Performance controls include capped device-pixel ratio (1.3 for coarse pointers, 1.75 otherwise), reduction to 1 after sustained slow frames, and suspension when the document is hidden or the artwork is outside the viewport. Initial ambient motion lasts at most 4.5 animation seconds; input extends the response by 3.2 seconds. The settled state schedules no continuous frames. Reduced motion schedules none. The original image is approximately 96 KB; the build gate caps JavaScript at 60 KB.

`src/curiosity-trail.ts` owns an inert, fixed SVG with a reusable pool of 36 fragments: slivers, shards, filaments, glints and dust. The artwork module feeds it viewport pointer coordinates and a destination on an approximate ellipse around the sculpture. Six-piece bursts accelerate along independent quadratic curves, rotate, skip gently sideways and briefly brighten; the curves themselves are invisible. Each lives 380–650ms of animation time. Navigation, pointer release/cancellation, scroll, hidden tabs and reduced motion clear the pool. Entering the broad ellipse hides particles temporarily. Sustained exploration in its inner region, an intentional click/touch, or keyboard activation retires them for the page visit. The discovery gate requires 1.2 seconds and 24px of movement with no input gap over 300ms. This avoids permanent dismissal from incidental crossings of the approximate boundary. No storage is used. Particles share the existing frame loop and cannot intercept clicks or touch scrolling.

## Interaction and accessibility

- The artwork surface is a native button. Primary pointer movement changes perspective and triggers ripples at most once per 0.45 seconds within the silhouette. Mouse and pen hover need no click. Touch contact works immediately; finger hover is possible only when hardware/browser reports it through Pointer Events. Enter/Space sends a ripple and a polite announcement. Arrow keys move the light; Escape settles it immediately. Continuous pointer movement does not spam the live region.
- Vertical touch scrolling stays available through `touch-action: pan-y`; this is not a full-screen gesture trap.
- There is no pause button or session-storage dependency. Bounded motion avoids perpetual background animation; interaction can restart it after settling.
- `prefers-reduced-motion` keeps the artwork still, disables its interaction surface, hides invitations, and disables CSS and shuffle animation. Preference changes apply immediately in both directions and clear any active ripple/tilt.
- Catalog filters use native buttons and pressed states, update the visible item count, and preserve the filter in `?collection=`. This query is canonicalized to `/merch/` for SEO.
- Shuffle uses Fisher-Yates and guarantees a changed order when at least two products are visible. Reduced-motion users receive the new order immediately.
- Gallery thumbnails are real image links; JavaScript swaps the main image while modified clicks retain their native behavior.
- Product details use native `<details>`. Focus indicators, a skip link, semantic landmarks and alternative text are included.

Physical Safari/iOS, VoiceOver and Apple hardware testing remain part of a release team's device checks. The cloud browser verification is not a claim that every browser/device combination has been tested.

## SEO and privacy

Every content page receives a title, description, HTTPS canonical URL, Open Graph/Twitter metadata and structured data. The sitemap includes only the canonical content routes. `robots.txt` permits crawling. Assets and fonts are self-hosted; no analytics, trackers, cookies, third-party JavaScript or contact form is installed. Vendor checkout links and the contact website open in a new tab with `noopener noreferrer` and an accessible indication.

These measures support indexing and good performance; search rankings and rich-result eligibility are not guaranteed. Add organization claims or offer data only when they are public, correct and maintainable.
