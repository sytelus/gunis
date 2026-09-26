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

The sculpture is an authored image, not a rotatable 3D mesh. Enhancement is layered so that every stage has a working fallback:

1. The normal WebP image is immediately visible and has meaningful alt text. CSS alone plays the arrival choreography of the copy.
2. After idle time, `src/artwork.ts` loads, waits for the image to decode and loads a small data map, `src/assets/learning-loop-maps.png`.
3. If a WebGL2 context and its programs initialize, `src/light-field.ts` takes over one page-wide canvas and the image fades out.
4. Otherwise the image stays and responds with restrained perspective and saturation, and the SVG curiosity trail (`src/curiosity-trail.ts`) invites exploration.
5. If a context is lost, the image returns immediately. A restored context resumes the light field.

### Light field

One `<canvas class="light-field">` is inserted before `.home-shell` and absolutely positioned over the whole document, behind all content. It scrolls with the page instead of being fixed, so the redrawn sculpture never lags the layout during iOS momentum scrolling, and it spans the full width so motes can use the margins of wide screens. Each frame makes three draw calls in one context:

- **Swarm step.** Up to 49,152 motes (position, velocity, depth, seed, energy, mode) live in two GPU buffers. A vertex shader advances them with transform feedback, so no per-mote JavaScript runs. Forces are a divergence-free curl-noise current, the pointer's swept wake (extended ahead of the pointer once the swarm has "learned", level 2), an invitation current toward the sculpture, hold-to-gather vortex and release burst, shake scatter, an emitter that re-spawns motes on the sculpture's centreline for the arrival and level-up "exhale", and flow or formation along the figure-8.
- **Sculpture.** A quad over the image rectangle redraws the artwork with image-based light. The data map (R matte, G inflation height, B position along the loop) gives the flat raster enough shape to be relit relative to its baked studio light, so the light at rest reproduces the original. Moving light adds specular and iridescent glass response, ripples, a droplet lens under a hovering pointer, converging "gather" rings, warm floor light pools that restore the selected reference's ground caustics, and a band of light that runs along the loop during an upgrade. The shader adds the measured difference between the page paper and the image's studio backdrop, so the feathered edge disappears.
- **Motes.** Instanced, velocity-stretched quads. A mote is visible only while it carries energy, so the settled page is the selected design. Over paper the cores are deep chromatic colours; over the sculpture and along the loop they become light: spectral sparkles with a four-ray glint and warm halo. Far motes pass behind the figure using the matte; loop motes hide where their strand runs behind the glass.

The data map is derived deterministically from `design/assets/learning-loop.png` by `scripts/sculpture-maps.mjs` (part of `npm run prepare:assets`): backdrop-difference segmentation with hole detection and floor separation, an exact Euclidean distance transform inflated into a tube-like height, and the nearest position on the hand-traced centreline in `src/data/loop-path.json`. It is stored as 3-channel PNG so browsers cannot premultiply the packed data. Vite fingerprints it because the client imports it.

The browser chooses its adapter, including Apple GPU-backed implementations where available. The code never reads renderer identity or requires WebGPU. Quality follows observed frame pacing only: the drawing buffer uses a pixel budget (1.4, 3.2 or 5.6 million pixels, capped at device pixel ratio 2) and the swarm a matching density. Except on the lowest tier, the resolution never drops below what keeps the sculpture at its source detail (or the screen's, if lower), so the budget mainly limits empty margins on very large screens. The middle tier starts; sustained long frames step down, and a steady arrival steps up once. Low Power Mode and busy GPUs therefore keep the lighter tier.

### Motion budget

A single `requestAnimationFrame` loop drives the renderer, the fallback and the heading; nothing that runs inside a frame may schedule another one (the browser checks assert that the code never has two frame requests outstanding). Arrival motion lasts 4.5 animation seconds; every interaction extends it by 3.2 seconds (an upgrade by 5.6). During the final 1.1 seconds all motion eases to rest and motes fade; the last frame is drawn without motes and then no frames are scheduled. Hidden tabs schedule nothing. Escape settles immediately and clears transient effects (ripples, lens, flash, gather rings, an unfinished upgrade), so the still frame is the clean design. Reduced motion schedules nothing and draws one still frame.

### Discovery levels

Nothing is stored between visits. Level state is exposed as `data-level` on the artwork for tests and styling.

| Level | Reached by                                                                                                                 | What changes                                                                                                                  |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 0     | Arrival                                                                                                                    | Stirred motes are drawn toward the sculpture (`data-invite`)                                                                  |
| 1     | 1.2 s and 24 px of exploration inside the figure, a touch on it, keyboard activation or arrow keys                         | The invitation retires; motes that reach the sculpture flow along its figure-8; the swarm grows; the status dot pings         |
| 2     | Three taps, one charged release, a shake or about 9 s of play                                                              | The swarm anticipates the pointer instead of trailing it                                                                      |
| 3     | A loop drawn around the sculpture, a circular phone tilt, four rotating arrow keys, three charged releases or 40 s of play | Upgrade: the swarm forms the loop, light runs along it, "Upgraded." flashes, the mark spins, then a burst; glass stays richer |

The upgrade can be replayed after seven seconds. `src/gestures.ts` holds the pure loop and arrow-key recognizers.

### The sculpture puzzle and the second sculpture

With WebGL2, hovering the figure shows its ring seams faintly and the ring under the pointer jiggles, loose like a dial. The first touch, click or Enter twists the picture into three concentric rings (`src/puzzle.ts`), each at one of six positions (60° steps). The goal is visible without words: every ring carries an orange bead, a fixed orange marker and a faint line at the top show where the beads belong, rings out of place lose their colour, and a ring at home blooms back and its bead turns gold. A tap turns a ring one step clockwise; dragging turns it like a dial and it snaps to the nearest step on release (during the puzzle the artwork uses `touch-action: none` so fingers turn rings instead of scrolling). Rings are independent; scrambles put every ring out of place, no two alike. Keyboard: Up and Down choose a ring, Left and Right (or Enter) turn it. The shader (`u_rings`) reads the picture, its shape map and its light through each ring's turn. Escape or reduced motion makes the picture whole at once, and an abandoned puzzle heals itself after 45 seconds so the resting page is the selected design; only solving leads on.

Solving starts the reveal: the seams glow, the picture dissolves grain by grain into light (`u_dissolve`), the loop exhales most of the swarm, and the swarm's path switches to the projected centrelines of a new sculpture while the upgrade forms it. The second sculpture is raymarched in its own pass over the artwork rectangle: two linked tori, prismatic glass above and ceramic below. Glass refracts in and out with three indices (dispersion) and traces the ceramic ring behind it; thin-film colour, a structured studio environment, ambient occlusion, soft shadows and a coloured caustic floor complete it. The lowest quality tier uses one refracted ray. It turns slowly while active, leans toward the pointer and a phone's tilt, spins with a sideways drag, and a tap sends a pulse of light around both rings. It still settles to a still frame. `data-game` and `data-rings` expose the state for tests.

## Interaction and accessibility

- The artwork surface is a native button. Pointer movement anywhere on the page stirs the swarm, except over links and other buttons. Over the figure the light follows the pointer, a droplet lens appears and ripples are sent at most once per 0.45 seconds. Mouse and pen hover need no click. Touch contact works immediately; the lens is lifted 56 px above a finger so it is not hidden. A primary-button press held for more than 0.35 real seconds gathers motes into a vortex that follows the pointer and bursts on release. A hold keeps motion alive for at most ten seconds, and losing focus or the window ends it, so no press can keep the page animating.
- Enter/Space sends a ripple and a polite announcement. Holding Space gathers and bursts. Arrow keys move the light and a virtual pointer around the sculpture; four arrows that rotate draw the loop. Escape settles immediately. Continuous pointer movement never updates the live region.
- The home page uses `touch-action: pan-y pinch-zoom`. Vertical scrolling and pinch zoom stay native, while sideways finger drags stay with the page: they stir the swarm instead of being cancelled or treated as swipe-to-go-back. Once the page is pinch-zoomed (`visualViewport.scale > 1`), an `is-zoomed` class restores ordinary one-finger panning. Page text stays selectable; selection is suppressed only while a press-and-hold is in progress.
- Device orientation moves the light, parallax and glints; a circular tilt draws the loop and three sharp jolts scatter the swarm like a snow globe. A slowly re-centred baseline makes any holding angle neutral. Only a deliberate turn wakes the page: the orientation must move more than 4 degrees away from an average that trails it by about a third of a second, so tremor and the slow drift of a phone held while reading never animate it. Sensors are secure-context only. Browsers that grant access without a prompt (Chromium) enable it at load; iOS asks from the visitor's first tap on the artwork, the user gesture it requires. Denial changes nothing else.
- The heading keeps its real words. `src/headline.ts` replaces the "Learning" text node with a visually hidden copy plus aria-hidden letters whose widths are locked to the measured glyph advances, so swelling weights never shift layout (the browser checks compare its box with the no-JavaScript page). An aria-hidden duplicate of "Upgraded." paints only a moving prismatic band. The accessible name of the heading is unchanged.
- `prefers-reduced-motion` keeps the artwork still, disables its interaction surface, hides invitations, keeps the heading static and removes all CSS animation. Preference changes apply immediately in both directions and clear active effects.
- Catalog filters use native buttons and pressed states, update the visible item count, and preserve the filter in `?collection=`. This query is canonicalized to `/merch/` for SEO.
- Shuffle uses Fisher-Yates and guarantees a changed order when at least two products are visible. Reduced-motion users receive the new order immediately.
- Gallery thumbnails are real image links; JavaScript swaps the main image while modified clicks retain their native behavior.

## Merch cabinet

`src/main.ts` loads `src/cabinet.ts` only on the collection and product pages. Every product, filter, link and purchase path is plain HTML first; the cabinet adds light and motion.

- **Lamp.** A fixed `.lamp` layer behind the content paints a pool of light at the pointer. On touch screens it rests mid-screen at 85% and moves with device tilt where the browser allows. One animation frame loop runs only while the lamp moves and writes CSS variables: each product turns toward the lamp (at most 8° and 6°), catches glare where the lamp reflects and casts a soft shadow away from it. Positions come from layout offsets, so a product's own tilt never skews them.
- **Product light.** `scripts/generate.mjs` asks `scripts/palette.mjs` for two light colours per product from its photo: the garment and print, not the backdrop, skin or greys (which fall back to the brand accent). Cards and product pages carry them as `--glow`/`--glow2`. The lamp takes the colour of the product being looked at and brightens; the product page is lit by its product, and its buy button takes the product's colour, darkened toward ink so its label keeps at least 4.5:1 contrast.
- **Prism filters.** Products leaving the collection become decorative, inert copies (`.product-ghost`, `aria-hidden`) that fly into the chosen filter; new ones fly out of it; the rest glide to their places. The real grid changes at once, so assistive technology and the count are never delayed. The chosen filter is an ink lens that clips light copies of every label, counter-moved so they stay put: labels invert exactly where it passes. Browsers that run scripts reserve the toolbar's space while the cabinet loads (`@media (scripting: enabled)`), so the collection never shifts.
- **Dealt shuffle.** The new order is applied at once; visually, the photos gather into a pile mid-screen and are dealt out again while names and links wait in place.
- **Constellation.** Each product is discovered after 1.2 seconds in view, 0.45 seconds of hover or keyboard focus. Its dot lights in its colour. The complete set moves into the Guni mark (two interlinked rings of five and a detached dot) and ring lines draw through it, while one sweep of light crosses every photo. Nothing is stored.
- **Page transitions.** Browsers with cross-document view transitions morph pages into each other; a product's photo carries over between the collection and its page because both views share a `view-transition-name`. Gallery thumbnails morph the main photo too. Product details unfold smoothly where `interpolate-size` is supported, and photos develop like prints as they scroll into view where scroll-driven animations are supported.
- **Preferences.** Reduced motion turns the lamp off, makes filters and shuffles instant and disables view transitions. Forced colours hide decorative light layers and mark the pressed filter with a system outline. Print hides the lamp.
- Product details use native `<details>`. Focus indicators, a skip link, semantic landmarks and alternative text are included.

Physical Safari/iOS, VoiceOver and Apple hardware testing remain part of a release team's device checks. The cloud browser verification is not a claim that every browser/device combination has been tested.

## SEO and privacy

Every content page receives a title, description, HTTPS canonical URL, Open Graph/Twitter metadata and structured data. The sitemap includes only the canonical content routes. `robots.txt` permits crawling. Assets and fonts are self-hosted; no analytics, trackers, cookies, third-party JavaScript or contact form is installed. Vendor checkout links and the contact website open in a new tab with `noopener noreferrer` and an accessible indication.

These measures support indexing and good performance; search rankings and rich-result eligibility are not guaranteed. Add organization claims or offer data only when they are public, correct and maintainable.
