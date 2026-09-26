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

`prepare:assets` uses Sharp to export the WebP sculpture and PNG mark/favicons. The active logo source is `design/concepts/guni-linked-g-v4.png`, selected by the owner for website testing. The script crops presentation whitespace to a 960px square at (145,149), preserving the entire symbol and dot, then exports all sizes from that same framing. This is the actual generated concept, not a vector redraw. The header export gets a real alpha channel by colour-to-alpha against the raster's own near-white background; `mix-blend-mode` could not reach the page paper through the header's stacking context and left a light square. All headers and logo metadata use `public/assets/brand/guni-mark.png`. The original `design/assets/guni-mark.png` remains intact for rollback; to restore it, change the script's `mark` source to that file and remove the crop, then regenerate assets and the social card. The script also copies local fonts and icons with licenses, and runs `scripts/sculpture-maps.mjs` to rebuild `src/assets/learning-loop-maps.png` from the sculpture source (see below). Commit source and runtime exports together; normal builds use committed exports. `prepare:assets` rewrites `docs/licenses/phosphor.txt` with the package's CRLF line endings; restore it with `git checkout` if it is the only change.

After copy, typography or mark changes, run `npm run prepare:social`. This renders the current homepage at 1200 × 630 into `public/assets/brand/social-cover.jpg`. Then rebuild to include the new card. The original generated social card remains in `design/assets/` for provenance; `prepare:assets` leaves the current social card intact.

## Artwork interaction

`src/artwork.ts` owns input, time, discovery levels, sensors, quality and settling; `src/light-field.ts` only turns its per-frame state into pixels; `src/headline.ts` owns the heading play; `src/gestures.ts` holds the pure loop and arrow-key recognizers; `src/curiosity-trail.ts` is the SVG invitation used only without WebGL2. Keep one frame loop: never add a second permanent animation loop, a timer-driven animation, or anything that keeps drawing after the page settles. Code that runs inside a frame (for example an upgrade earned by play) may only extend `activeUntil`; `wake()` never schedules while a frame is running. Shaders must avoid `pow()` of a possibly negative base and `smoothstep()` with reversed edges, which GLSL leaves undefined.

Tuning lives at the top of each module:

| Knob                               | Where               | Current value                                                                   |
| ---------------------------------- | ------------------- | ------------------------------------------------------------------------------- |
| Arrival, response, final calm      | `artwork.ts`        | 4.5 s, 3.2 s (upgrade 5.6 s), last 1.1 s ease to rest                           |
| Hover ripple interval              | `artwork.ts`        | 0.45 s                                                                          |
| Quality tiers                      | `artwork.ts` TIERS  | 1.4 / 3.2 / 5.6 million pixels; densities 1/150, 1/85, 1/55 per px²             |
| Swarm growth per level             | `artwork.ts`        | 0.72, 0.86, 1, 1.12 of the tier density                                         |
| Arrival and level-up exhale        | `artwork.ts`        | 30% of the swarm over 1.4 s; 7% over 0.6 s; at most 3,200 motes                 |
| Hold, release                      | `artwork.ts`        | gather 0.18–1.5 real seconds; burst after 0.35 s; keeps motion at most 10 s     |
| Tilt range, wake rule, re-centring | `artwork.ts`        | ±18°; wakes beyond 4° from a 0.35 s trailing average; re-centres 0.6% per event |
| Discovery and upgrade thresholds   | `artwork.ts` `tick` | see the table in `docs/architecture.md`                                         |
| Loop gesture                       | `gestures.ts`       | one full turn within 6 s, no pause over 650 ms, radius 0.3–3                    |
| Capacity, path samples             | `light-field.ts`    | 49,152 motes; 64 centreline samples                                             |
| Mote palette, sizes, glints        | `light-field.ts`    | `CORE` and `GLINT` in the mote shader                                           |
| Letter swell                       | `headline.ts`       | weight 500 to 690                                                               |

The exploration rule that retires the invitation is unchanged from the SVG trail: 1.2 seconds and 24 px of movement inside the inner 82% of the interaction ellipse with no input gap over 300 ms, or an intentional touch, click or keyboard activation. A brief crossing never retires it. It uses PointerEvent timestamps, not the clamped animation clock. Holds are also measured in real time, because animation time runs slower on a busy GPU.

Pointer Events permit mouse and supported stylus hover without contact. Ordinary touch screens cannot detect a hovering finger; touch-down/movement is their supported interaction. The home page's `touch-action: pan-y pinch-zoom` keeps vertical scrolling and zoom native while sideways drags stir the swarm; preserve it along with passive listeners and cancellation handling. No pointer capture is needed. Hints stay hidden until enhancement succeeds and remain hidden for reduced motion. Avoid adding live announcements for hover, tilt or upgrades; the one existing announcement is for keyboard activation.

Sensors: `DeviceOrientationEvent.requestPermission` exists in Chromium too, where it resolves without a prompt, so the code tries it once at load and again from the first real tap (the gesture iOS requires). Never prompt from anything but a tap on the artwork.

The loop path in `src/data/loop-path.json` is shared by the map generator and the runtime (uniform Catmull-Rom in image UV, with `z` = +1 for the glass strand in front at the crossing and -1 for the ceramic strand behind). If the sculpture artwork changes, retrace the path, run `npm run prepare:assets`, and inspect the matte, height and path-parameter diagnostics the generator logs before committing.

Inspect the social card at 1200 × 630, the mark at header and favicon sizes, and the hero at desktop and mobile crops. Avoid introducing external font requests or large animation libraries without evidence of a benefit.

## Sculpture puzzle

Rules live in `src/puzzle.ts` (rings, six positions, radii, centre, scramble) and are unit tested; the ring cut and dissolve are in the sculpture shader, and the second sculpture is `ORB_FS` with its geometry in `ORB` in `src/light-field.ts`. Tuning in `src/artwork.ts`: ring spring (170, damping 19), fireflies (`S.contain`: 7% of the swarm, tube 9.5% of the artwork width, 7.5% after the reveal), heal delay (`HEAL_AFTER`, 45 s), reveal timeline in `playGame` (dissolve 0.9–2.4 s, formation from 1.3 s, sculpture 1.4–3.6 s). If the artwork is replaced, re-check `CENTER` and `RADII` against the new picture. Shaders are minified at build time (comments and indentation removed) by the `guni-glsl` plugin in `vite.config.mjs`; keep `//` out of anything but comments. The JavaScript gate is 80 KB, raised from 60 KB for this feature (the owner does not treat script size as a constraint).

## Merch cabinet

`src/cabinet.ts` owns the merch lamp, filters, shuffle, constellation and gallery; `scripts/palette.mjs` computes each product's light colours during generation (Sharp only, deterministic). Tuning:

| Knob                          | Where         | Current value                                                      |
| ----------------------------- | ------------- | ------------------------------------------------------------------ |
| Turn toward the lamp          | `cabinet.ts`  | 8° around the vertical axis, 6° around the horizontal, over 800 px |
| Glare, shadow                 | `cabinet.ts`  | glare up to 0.45; shadow offset up to 16 px                        |
| Resting lamp on touch screens | `cabinet.ts`  | `REST` = 0.85                                                      |
| Lamp pool strength            | `styles.css`  | 34%, 58% while a product is looked at (`is-tinted`)                |
| Filter flights, deal          | `cabinet.ts`  | 520 ms out, 760 ms in (45 ms stagger), 1.5 s deal                  |
| Discovery                     | `cabinet.ts`  | 1.2 s at 60% in view, 0.45 s hover, or focus                       |
| Palette sampling              | `palette.mjs` | centre torso crop; skin and greys ignored; fallback brand accent   |

Flying copies are `.product-card` clones with `.product-ghost`; count real products inside `.product-grid`. When adding a product, check its generated `--glow` in `merch/index.html`; a photo with no vivid colour correctly falls back to the brand accent. If a new product's colour reads wrong, adjust the crop or thresholds in `palette.mjs` rather than hard-coding colours.

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

The tests protect migration content, unsafe URL handling, HTML/JSON escaping, complete static content, redirects, the landing page's exact copy, links and accessible names, the sculpture map's 3-channel format, and the loop and arrow-key gesture recognizers (imported from TypeScript through Node's type stripping). The production verifier checks actual output routes, local links/assets, canonical metadata, JSON-LD, required Pages files and the JavaScript budget. These checks do not place orders or verify vendor stock.

For a visible change, inspect the production preview at approximately 320/390 px, tablet width, and a desktop viewport. Check wrapping, scrolling, keyboard focus, filter/shuffle states, the gallery, purchase/contact destinations and console errors. `npm run test:browser` starts a temporary preview and runs Chromium checks with software WebGL2: the light field goes live, settled frames are pixel-identical, pointer movement makes motes visible and settling clears them, the split heading keeps its accessible name and exact box, letters swell and rest, a brief pass does not retire the invitation but exploration does, hold/release, keyboard activation, Escape, the rotating-arrow and drawn-loop upgrades, tilt and tremor rejection, live reduced motion, context loss/recovery, the image fallback with its SVG trail and pen hover, layouts from 320 px phones to 2560 px screens and phones held sideways, touch drags that stay on the page, touch scrolling, no-JS content, and the merch cabinet: no layout shift while it loads, product light and the lamp, prism filters and lens, the dealt shuffle, the constellation, reduced-motion filtering, product-page tint and gallery navigation. It writes screenshots under `.qa/` and closes the browser/server. Physical Safari/iOS, real GPUs, motion sensors and hovering touch hardware still need device checks. For realistic frame rates on a Linux workstation, Chromium can also run Mesa's llvmpipe with `--enable-gpu --ignore-gpu-blocklist --use-gl=angle --use-angle=vulkan`. No browser-test code is bundled into the site.

For dependency updates, update the lockfile deliberately, rebuild, and test the affected behavior. Formatting is controlled by `.prettierrc.json`; generated output, binaries and QA images are excluded.

## Common fixes

| Symptom                                        | What to inspect                                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Copy changes do not appear                     | Edit the template, not generated HTML; restart `npm run dev` if the watcher was interrupted     |
| New images fail the build                      | Check case-sensitive filenames and `/assets/products/` paths                                    |
| Artwork is static                              | It settles after inactivity; move over it to wake it. Check OS reduced motion or unavailable JS |
| Artwork uses perspective instead of refraction | WebGL2 is unavailable or initialization failed; the fallback with the SVG trail is expected     |
| No motes appear                                | They are only visible while stirred; move through whitespace. Check reduced motion and WebGL2   |
| Tilt does nothing on iPhone                    | iOS asks for motion access from the first tap on the sculpture; denied access is respected      |
| Old content remains after deployment           | Check the latest Actions run, published commit, then browser/CDN cache                          |
| Pages asset URLs break                         | Confirm the custom domain is guni.ai and Vite's base is `/`                                     |
| Legacy product URLs break                      | Keep the portfolio redirect alongside the canonical product route                               |
