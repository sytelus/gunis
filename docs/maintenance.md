# Content and maintenance

## Editing copy

The landing page, shared navigation/footer and metadata live in `src/pages.mjs`. Change visible copy and its description/social metadata together. The hero heading stays real HTML, separate from the artwork. Keep the concise public purpose and coming-soon positioning; avoid inventing product details.

The canonical URL is `SITE`; contact is `CONTACT`. A domain migration also requires `public/CNAME`, the manifest, deployment verification, DNS and GitHub Pages settings to be updated together. Changing the CNAME file alone is insufficient.

## Products

Edit `src/data/products.json`. Array order defines the default collection order; the inherited `order` field records the original storefront ordering but is not used as a second sort key.

Each product has a unique lowercase hyphenated `slug`, `name`, `category` (`tees`, `dresses`, or `objects`), `image`, short `description`, HTTPS `buyUrl`, `vendor` (`Zazzle` or `Redbubble`), Markdown `details`, and a `gallery` array. Each gallery entry has `image` and `alt`. Use an empty array when no additional views exist.

Images live under `public/assets/products/<slug>/` and are referenced as `/assets/products/<slug>/<filename>`. Favor useful alternative text and high-resolution originals with a stable crop. The inherited images are preserved exactly, and some small originals look soft on large screens. Replace them with owner-approved higher-resolution photos when available; never invent images that misrepresent the product.

Adding a product automatically creates a canonical detail page, a legacy portfolio redirect, sitemap entry and Vite input. The migration regression test intentionally records the original 11-product collection; adjust that expectation consciously when the collection grows. The build's expected HTML count must likewise change: **6 + 2 × product count**. Deleting a product should retain an explicit redirect from its old URLs instead of silently removing a destination people may have bookmarked.

Vendor links are opened externally; this site does not collect payment or display a price that could go stale. Changing vendors requires updating the allowed host contract and testing the destination. Do not paste affiliate IDs, tracking links or unsupported shipping claims without a deliberate editorial decision.

## Brand assets

Original generated PNGs are retained in `design/assets/`; the selected concept is `design/selected-reference.png`. Replace a source asset only after comparing it with the intended art direction, then run:

```sh
npm run prepare:assets
npm run build
```

`prepare:assets` uses Sharp to export the WebP sculpture, PNG mark/favicons and JPEG social card. It also copies local WOFF2 fonts and Phosphor light icons from their pinned npm packages, preserving licenses in `docs/licenses/`. It performs no network image generation. Commit both the edited source and the runtime export. Normal builds use committed exports and do not regenerate artwork.

Inspect the social card at 1200 × 630, the mark at header and favicon sizes, and the hero at desktop and mobile crops. Avoid introducing external font requests or large animation libraries without evidence of a benefit.

## Development checks

```sh
npm ci
npm run format
npm run format:check
npm test
npm run build
npm run preview
```

The tests protect migration content, unsafe URL handling, HTML/JSON escaping, complete static content and redirects. The production verifier checks actual output routes, local links/assets, canonical metadata, JSON-LD, required Pages files and the JavaScript budget. These checks do not place orders or verify vendor stock.

For a visible change, inspect the production preview at approximately 320/390 px, tablet width, and a desktop viewport. Check wrapping, scrolling, keyboard focus, filter/shuffle states, the gallery, purchase/contact destinations and console errors. For motion changes, test OS reduced motion, pause/resume, keyboard activation, hidden-tab behavior, and WebGL-disabled fallback. A fresh browser profile helps catch cached assets and stored motion preferences.

For dependency updates, update the lockfile deliberately, rebuild, and test the affected behavior. Formatting is controlled by `.prettierrc.json`; generated output, binaries and QA images are excluded.

## Common fixes

| Symptom                                        | What to inspect                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Copy changes do not appear                     | Edit the template, not generated HTML; restart `npm run dev` if the watcher was interrupted |
| New images fail the build                      | Check case-sensitive filenames and `/assets/products/` paths                                |
| Artwork is static                              | Check the pause toggle and OS reduced motion; a static image is the intended no-JS state    |
| Artwork uses perspective instead of refraction | WebGL is unavailable or initialization failed; the fallback is expected                     |
| Old content remains after deployment           | Check the latest Actions run, published commit, then browser/CDN cache                      |
| Pages asset URLs break                         | Confirm the custom domain is guni.ai and Vite's base is `/`                                 |
| Legacy product URLs break                      | Keep the portfolio redirect alongside the canonical product route                           |
