# Content and maintenance

## Editing copy

The landing page, shared navigation/footer and metadata live in `src/pages.mjs`. Change visible copy and its description/social metadata together. The hero subtitle is “For humans. For AI.”; “A billion small brains > one giga brain” belongs in the shared footer. The hero heading stays real HTML, separate from the artwork. Keep the concise public purpose and coming-soon positioning; avoid inventing product details.

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

`prepare:assets` uses Sharp to export the WebP sculpture and PNG mark/favicons. The active logo source is `design/concepts/guni-linked-g-v4.png`, selected by the owner for website testing. The script crops presentation whitespace to a 960px square at (145,149), preserving the entire symbol and dot, then exports all sizes from that same framing. This is the actual generated concept, not a vector redraw. The header uses `mix-blend-mode: darken` to blend its pale raster background into the paper surface. All headers and logo metadata use `public/assets/brand/guni-mark.png`. The original `design/assets/guni-mark.png` remains intact for rollback; to restore it, change the script's `mark` source to that file and remove the crop, then regenerate assets and the social card. The script also copies local fonts and icons with licenses. Commit source and runtime exports together; normal builds use committed exports.

After copy, typography or mark changes, run `npm run prepare:social`. This renders the current homepage at 1200 × 630 into `public/assets/brand/social-cover.jpg`. Then rebuild to include the new card. The original generated social card remains in `design/assets/` for provenance; `prepare:assets` leaves the current social card intact.

## Artwork interaction

`src/artwork.ts` owns pointer/keyboard input, graphics, motion preferences, visibility and cleanup. `src/curiosity-trail.ts` draws the invitation using the same frame loop. Tune idle duration (4.5 seconds), response duration (3.2 seconds), hover ripple interval (0.45 seconds), ellipse bounds (38% width / 43% height) in the artwork module. The particle module contains the shape/color palettes, fixed capacity (36), emission interval (55ms), and fragment lifetime (380–650ms). Six particles are emitted per accepted pointer event and pooled nodes are reused. Each follows its base curve with a small tapering sideways skip and a slight mid-flight scale lift. Shape scale is 1.6–2.5; colored cores remain at 82–100% opacity except for brief entry/exit fades. Keep this contrast and size when adjusting the glow. These times are animation time and suspend with hidden/offscreen rendering. Never add a second permanent animation loop or draw continuous guide curves.

Pointer Events permit mouse and supported stylus hover without contact. Ordinary touch screens cannot detect a hovering finger; touch-down/movement is their supported interaction. Preserve `touch-action: pan-y`, passive listeners and cancellation handling so scrolling remains natural. No pointer capture is needed. Hints stay hidden until enhancement succeeds and remain hidden for reduced motion. Avoid adding live announcements for every hover event.

The particles are an introductory cue. `hide()` clears live particles temporarily, including when crossing into the broad interaction ellipse. `dismiss()` retires them for the page visit only after intentional click/touch, keyboard activation, or sustained exploration. `hasExplored()` in `src/artwork.ts` requires 1.2 seconds and 24px of pointer travel inside the inner 82% of the interaction ellipse, with no input gap over 300ms. Leaving that region, navigation, release, scrolling or reduced motion resets the exploration candidate. These use PointerEvent timestamps, not the clamped shader clock. Do not dismiss on first entry: the broad ellipse includes whitespace, and casual crossings previously made sparkles appear to stop unpredictably. No pointer speed/direction condition applies to emission outside the figure. Discovery requires no storage and resets on a fresh page load. The visible hint is fixed “A little curiosity”; keep explicit instructions in the artwork button's accessible label.

Inspect the social card at 1200 × 630, the mark at header and favicon sizes, and the hero at desktop and mobile crops. Avoid introducing external font requests or large animation libraries without evidence of a benefit.

## Development checks

```sh
npm ci
npm run format
npm run format:check
npm test
npm run build
npm run preview
npm run test:browser
```

The tests protect migration content, unsafe URL handling, HTML/JSON escaping, complete static content and redirects. The production verifier checks actual output routes, local links/assets, canonical metadata, JSON-LD, required Pages files and the JavaScript budget. These checks do not place orders or verify vendor stock.

For a visible change, inspect the production preview at approximately 320/390 px, tablet width, and a desktop viewport. Check wrapping, scrolling, keyboard focus, filter/shuffle states, the gallery, purchase/contact destinations and console errors. `npm run test:browser` starts a temporary preview and runs Chromium checks for WebGL hover, trails, automatic settling, keyboard, live reduced-motion changes, image fallback, pen events, touch scrolling, context loss/recovery, responsive overflow, no-JS content and merch/gallery navigation. It writes screenshots under `.qa/` and closes the browser/server. Physical Safari/iOS and hovering touch hardware still need device checks. No browser-test code is bundled into the site.

For dependency updates, update the lockfile deliberately, rebuild, and test the affected behavior. Formatting is controlled by `.prettierrc.json`; generated output, binaries and QA images are excluded.

## Common fixes

| Symptom                                        | What to inspect                                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Copy changes do not appear                     | Edit the template, not generated HTML; restart `npm run dev` if the watcher was interrupted     |
| New images fail the build                      | Check case-sensitive filenames and `/assets/products/` paths                                    |
| Artwork is static                              | It settles after inactivity; move over it to wake it. Check OS reduced motion or unavailable JS |
| Artwork uses perspective instead of refraction | WebGL is unavailable or initialization failed; the fallback is expected                         |
| Old content remains after deployment           | Check the latest Actions run, published commit, then browser/CDN cache                          |
| Pages asset URLs break                         | Confirm the custom domain is guni.ai and Vite's base is `/`                                     |
| Legacy product URLs break                      | Keep the portfolio redirect alongside the canonical product route                               |
