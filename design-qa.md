# Design QA

## Company website for Apple enrollment — September 27, 2026

Apple Developer Support asked for "a valid company website" (public, functional, associated with the organization, not minimal or under construction). Research across Apple's documentation, Apple Developer Forums threads, Hacker News and developer guides (41 sources) found two checks: real content rather than a placeholder, and a visible link between the legal entity and the domain, plus a support/contact route. Changes: "Coming soon" became "First apps in development"; the homepage gained Our work, About and Contact sections below the untouched hero and artwork; every page names GUNIS LLC as the operator; new `/about/`, `/contact/` (support and contact on shital@guni.ai) and `/privacy/` pages; Organization structured data with legal name, founder and locality; the social card was re-rendered. The light-field canvas now covers only the first screen. No street address or phone is published. Checks: unit tests for operator, links, contact and no address leakage on every template; the full browser suite; 29 HTML pages verified.

## Puzzle clarity and fireflies — September 26, 2026

Owner feedback: the sparkles distracted once the visitor had arrived, and the puzzle was not intuitive. Changes: after discovery, stirring the page raises no sparkles; 7% of the swarm become golden fireflies contained in the sculpture, drawn to the pointer (`docs/qa/fireflies.jpg`). The puzzle now shows its goal and actions: hover jiggle and seams, orange beads with a fixed marker (line them up), grey rings until home, independent rings, tap to turn a step or drag like a dial, Left/Right keys (`docs/qa/game-puzzle.jpg`). Browser checks add: no page sparkles after discovery, a drag turning exactly one ring one step, Escape leaving no beads behind (a bug the check caught). The JavaScript gate is now 80 KB at the owner's direction.

## Sculpture puzzle revision — September 25, 2026

Owner request: evolve the sculpture into an intriguing, wordless puzzle whose solution reveals a second sculpture with more surprising GPU animation, consistent with the site's theme, without new or changed text.

- **Puzzle.** A touch twists the picture into three rings; out-of-place rings turn grey (`docs/qa/game-puzzle.jpg`). A tap turns a ring and the ring outside it; inside-out always solves it; scrambles need 4–7 turns. Hovered or keyboard-selected rings glow. No new text or announcements; the existing accessible name and announcement are unchanged.
- **Reveal.** The picture dissolves into the swarm, which forms two linked, raymarched 3D rings of glass and ceramic, with dispersion, refraction of one ring through the other, thin-film colour and caustic floor light (`docs/qa/game-reveal.jpg`, `docs/qa/game-sculpture.jpg`, phone: `docs/qa/game-phone.jpg`).
- **Motion and fallbacks.** Everything still settles to a still frame; Escape and reduced motion make the picture whole; an abandoned puzzle heals after 45 s; without WebGL2 there is no puzzle.
- **Checks.** Unit tests cover turn coupling, solvability of all 64 arrangements, scramble difficulty and ring hit-testing. Browser checks cover starting the puzzle by click, Escape, a full keyboard solve, the reveal under software WebGL, the revealed still frame and reduced motion abandoning a puzzle. JavaScript is 61.3 KB; the gate was raised from 60 to 64 KB, and shaders are now minified at build time.
- **Limits.** Chromium only (SwiftShader and llvmpipe). Raymarching cost on iPhone/iPad GPUs and Safari's shader compiler need a device check; quality falls back automatically on slow frames.

## Cabinet of curiosities revision — September 25, 2026

Owner request: make the merch page's UX fun and awe-inspiring, with novel ideas. Presentation only: products, copy, links, filters and purchase paths are unchanged, and everything works without JavaScript.

- **Lamp and product light.** A pointer-following lamp lights the collection; products turn toward it, catch glare and cast shadows away from it, and the page takes on the colours of the product being looked at (build-time palettes from each photo). Evidence: `docs/qa/cabinet-lamp.jpg`, `docs/qa/cabinet-phone.jpg`.
- **Prism filters and lens.** Leaving products fly into the chosen filter and new ones stream out; the lens inverts labels exactly where it passes, even mid-slide (`docs/qa/cabinet-filter.jpg`, captured by pausing every animation at 300 ms).
- **Dealt shuffle.** Photos gather into a pile and are dealt out; names wait in place (`docs/qa/cabinet-deal.jpg`).
- **Constellation.** Discovering all eleven products assembles the Guni mark from product-coloured dots with ring lines (`docs/qa/cabinet-constellation.jpg`).
- **Also.** Foil title, rolling count, product-coloured buy button (at least 4.99:1 contrast across all current products), photo-to-page morph, smoothly unfolding details, photos that develop on scroll.
- **Checks.** Unit tests cover the palette extraction (garment and print colours, grey fallback, skin rejection). Browser checks cover zero layout shift while the cabinet loads, product light and lamp tilt, filter flights and lens placement, the dealt shuffle leaving no residue, constellation completion, instant reduced-motion filtering, product-page tint, the gallery and the no-JS collection. The JavaScript gate holds at about 52 KB.
- **Limits.** As before, checks ran in Chromium (SwiftShader and llvmpipe). Cross-document view transitions, `interpolate-size` and scroll-driven animations are progressive: Safari and Firefox support differs and falls back to plain navigation, instant details and static photos.

## Living light revision — September 25, 2026

Owner request: make the landing page's style, theme and animation far more intriguing, surprising and playful, optimized for wide screens, iPhone, iPad and Mac, using the GPU, without adding, changing or removing any text or links. Leading visitors to discovery, serendipity through hover and device tilt, and ongoing play with anticipated surprises were the stated priorities.

Result: passed the automated and browser checks below. Presentation only: a unit test now locks the landing page's visible copy, link targets and accessible names to the previous text, and the heading's accessible name and box are compared with the no-JavaScript page in the browser checks.

- **Renderer.** One WebGL2 canvas behind the page (see `docs/architecture.md`) redraws the sculpture with image-based light from a derived matte/height/loop-path map and runs a transform-feedback swarm of up to 49,152 motes. At rest the frame reproduces the selected design; the image backdrop now matches the paper exactly, and warm floor light restores the reference's ground caustics. Without WebGL2 the authored image and the SVG trail remain.
- **Experience.** Arrival exhale from the loop; a swarm that appears only where stirred, streams toward the sculpture until it is explored, relights and ripples it, gathers under a held press and bursts on release, scatters on a shake, follows phone tilt with light, parallax and glints, anticipates the pointer at level 2, and at level 3 forms the figure-8 in a turning spectrum with light running along the loop. The heading swells and catches a foil sheen; the mark, link arrows, status dot and tagline sign have small finite rewards. Evidence: `docs/qa/living-light-arrival.jpg`, `living-light-swarm.jpg`, `living-light-upgrade.jpg`, `living-light-phone-gather.jpg`, `living-light-phone-burst.jpg`.
- **Settling.** All motion ends 3.2 animation seconds after the last input (5.6 after an upgrade), easing to rest over the final 1.1 seconds; the last frame has no motes and no further frames run. Escape settles immediately to the clean design. Only a deliberate phone turn wakes the page; tremor and slow drift do not. After settling, the page schedules no animation frames and no timers (measured over 3 s). Reduced motion keeps it still, including the CSS arrival choreography, and live changes work both ways.
- **Layouts.** Wide screens grow the composition to a 2400px shell (`living-light-wide.jpg`); portrait tablets stack a larger heading over a large sculpture instead of leaving an empty lower half (`living-light-tablet.jpg`); phones held sideways get a compact header with the headline and sculpture side by side (`living-light-landscape.jpg`); 1280 × 720 laptops now show the whole sculpture. Content respects safe-area insets. Checked with no horizontal overflow at 320, 375, 390, 430, 667 and 844 landscape, 820, 1024, 1180, 1280, 1366, 1920, 2560 and 3440 px.
- **Touch.** `touch-action: pan-y pinch-zoom` keeps vertical scrolling and zoom native while sideways drags stir the swarm; before this, Chromium's touch emulation treated a sideways drag as swipe-to-go-back and left the page. The lens is lifted above a finger. A long press does not open a callout.
- **Fixes found along the way.** The header mark's "invisible" background showed as a light square because `mix-blend-mode` could not reach the paper through the header's stacking context; the mark is now exported with real alpha, and the social card was re-rendered without the square. The artwork's keyboard focus ring follows its rounded hit area instead of a sharp rectangle. Printing uses the authored image instead of a possibly blank canvas.
- **Checks.** `npm run format:check`, `npm test` (10 tests, including gesture recognizers and the sculpture map format), `npm run build` (28 HTML files; JavaScript 43.2 KB against the 60 KB gate, the lazily loaded artwork chunk about 16 KB gzipped) and `npm run test:browser` passed. The browser checks now cover the WebGL2 light field, pixel-identical settled frames, visible motes on movement and their disappearance after settling, heading play without layout shift, discovery levels, hold and release, keyboard and drawn-loop upgrades, a clean Escape, no stranded Space hold, tilt, tremor and slow drift, a single frame loop during an upgrade earned by play, the canvas following wide-window resizes, live reduced motion, context loss and recovery, the image fallback with its trail and pen hover, responsive layouts including phones held sideways, touch drags that stay on the page, touch scrolling, no-JS content, merch and gallery.
- **Independent review.** A separate code review found 13 issues, four reproduced in a browser: a Space hold stranded by moving focus kept frames running; an upgrade earned by play started a second frame loop; the canvas did not follow wide-window width changes; Escape froze half-finished effects. It also found undefined GLSL (`pow` of negative bases, reversed `smoothstep`), clocks surviving reduced-motion toggles, a first keyboard move flinging motes, a keyboard burst overwritten by the click splash, the sculpture rendering below source detail on very large screens, heading widths measured before fonts could load, tilt drift re-waking held phones, the phone footer ignoring the safe area, and page-wide `touch-action`/`user-select` hurting zoomed panning and text selection. All were fixed; the browser checks now cover the observable ones, and the frame-loop check was shown to fail with its fix reverted.
- **Device limits.** WebGL ran on Chromium's SwiftShader (the CI path, a few frames per second) and Mesa llvmpipe (about 60 fps) for visual review. No physical GPU, Safari, iOS, iPadOS, VoiceOver or motion sensor was available: orientation and motion were exercised with synthetic events, touch with Chromium's touch emulation. Safari's permission prompt for motion access, Apple GPU performance, ProMotion pacing and Low Power Mode behavior still need device checks before release.

## Learning Upgraded revision — September 13, 2026

Latest logo color revision: the middle arc is removed, the dot retains its pale peach-orange tint, and both rings retain the deeper vermilion. Runtime header, icons and social card are exported from `design/concepts/guni-linked-g-v4.png`; the earlier single-color version remains for rollback.

Result: passed the browser and responsive checks below. This owner-requested revision supersedes the original copy, raster header mark, drag hint and pause-control requirements recorded in the historical review below.

- Heading: “Learning / Upgraded.” Hero subtitle: “For humans. For AI.” Footer: “A billion small brains > one giga brain” and a simple “Merch” link. Shared header: `guni.ai` with the owner-selected Linked G proposal, featuring two orange rings and a pale peach-orange detached dot, without a middle arc. Header, icons and social card use the same cropped raster concept for testing; the original source is retained for rollback. The original paper, glass/ceramic sculpture, font pairing and two-column composition remain.
- Mouse movement changes WebGL output without a click. A pooled wake of six mixed shards, slivers, filaments, dust and glints skips toward the sculpture, briefly catching colored light. The reduced 36-piece pool and six-piece bursts make the wake less dense; small sideways skips and mid-flight scale lifts make individual pieces more playful. No persistent guide curves are drawn. Each fragment lasts 380–650ms of animation time. Sustained exploration or intentional click/touch/keyboard interaction retires the effect for the page visit. The hint is a fixed “A little curiosity” and the original horizontal arrow, below the sculpture on phones.
- Intermittent-stop regression: a brief brush across the broad invisible ellipse permanently dismissed particles. A browser test reproduced this failure before the fix. It now verifies resumption after boundary crossings and short passes, slow one-pixel reversals on startup and after settling, plus retirement after deliberate exploration. Discovery now requires 1.2 seconds and 24px of movement in the inner 82% of the ellipse, with no input gap over 300ms; the broad boundary only hides particles temporarily.
- Visibility correction: fragments use 1.6–2.5× scale, dark orange/violet/teal cores and 82–100% opacity during the main flight. The lighter 36-slot pool emits six fragments at a time. This preserves visibility without making the wake dense or lengthening it; entry and exit fades occupy only 8% and 20% of its lifetime.
- The pause button is removed. Intro motion settles after 4.5 animation seconds; responses settle 3.2 seconds after input. Escape stops immediately. Live reduced-motion changes disable interaction and invitations, reset active effects, and work in both directions. The old stored pause setting is ignored.
- Chromium checks passed for WebGL hover, invitation appearance/disappearance, Enter/arrow/Escape controls, automatic settling, live reduced motion, no-WebGL image response, hovering pen PointerEvents, graphics context loss/restoration, touch input and actual vertical touch scrolling, JavaScript-disabled content, merch filters and product gallery navigation. No application exceptions or failed HTTP requests were observed.
- Phone widths 320 and 390, tablet width 820, and desktop 1487 were checked at device scale 1. No horizontal overflow. Full-page phone screenshots include the naturally scrolling footer. The new 1200 × 630 social card was rendered from the real HTML and inspected.
- Reproduce with `npm run test:browser`; screenshots go to `.qa/`. Current selected evidence: `docs/qa/learning-upgraded-desktop.jpg`, `docs/qa/learning-upgraded-mobile.jpg`, and `docs/qa/learning-upgraded-tablet.jpg`.
- `npm test`, strict TypeScript, production build, asset/link/metadata verification, formatting and dependency audit pass. Production JavaScript remains about 14.1 KB before compression against the 60 KB gate. Updated Markdown-it and Sharp remove the two dependency advisories found during installation.
- Device limits: WebGL was exercised using Chromium's software SwiftShader renderer. Touch scrolling used Chromium touch emulation; pen hover used a primary zero-button PointerEvent. Physical Safari/iOS, VoiceOver, hardware GPUs and hovering-finger hardware were not available. Ordinary phones cannot detect a finger hovering above the display; contact is the supported fallback.

## Original launch review (historical)

final result: passed

Reviewed 2026-09-13. No open P0/P1/P2 findings remain in the reviewed visual and interaction scope.

## Comparison evidence

- Visual source of truth: `design/selected-reference.png`, the owner's selected option 1, 1487 × 1058 pixels.
- Browser-rendered implementation: `docs/qa/desktop.jpg`.
- Combined full-view evidence: `docs/qa/design-comparison.jpg` (reference left, implementation right).
- Focused typography/mark evidence: `docs/qa/type-and-mark-comparison.jpg`, again source left and implementation right. This comparison was needed to inspect display type, logo scale and subtitle spacing clearly.
- Same homepage, light theme, launch copy and default active-motion state. The screenshot freezes one moment of the artwork's slow idle state.
- The implementation iframe was verified as **1487 × 1058 CSS px**, with scroll width also 1487. To fit the cloud browser capture surface, the entire iframe was displayed at 0.8 scale, captured at 1190 × 847 pixels and normalized to 1487 × 1058. Source and normalized implementation were then placed together for comparison. The runtime did not expose a separately configurable deviceScaleFactor; the recorded raster dimensions and CSS scaling describe the effective density. Tiny antialiasing differences from normalization are not treated as design defects.
- Additional captures: `docs/qa/mobile.jpg` (390 × 844 outer viewport, 375 px content plus scrollbar), `docs/qa/mobile-merch.jpg`, `docs/qa/tablet.jpg`, `docs/qa/merch.jpg` and `docs/qa/product.jpg`.

## Findings and comparison history

1. **P2, desktop heading position and type proportions — resolved.** The first combined comparison placed the heading roughly 30 CSS pixels too low and gave the sans line more width than the reference. Reduced desktop top padding from 18vh to 15vh, sans scale from 9.5vw to 9vw, and increased italic scale from 9vw to 9.5vw. The revised combined and focused captures show the two-line hierarchy and vertical alignment restored. Slight subtitle baseline variation from real font metrics is acceptable.
2. **P2, narrow-screen hint on the sculpture — resolved.** At 320 px and tablet width the gray interaction hint crossed the glass image, reducing legibility. Moved the hint to the clear control strip below the image on phones and to the left of the motion control on tablets. The post-fix mobile and tablet captures show separate, readable controls.
3. **P2, browser without WebGL lost the exploration affordance — resolved.** Added restrained perspective/color interaction using the actual image, with the same keyboard and pause controls. Browser verification confirmed the image renderer, pause/resume state and keyboard activation. The authored artwork remains available before JavaScript and on failure.
4. **P2, stale accessible filter count after shuffle — resolved.** Filtering now clears the shuffle-specific accessible label before updating the count; changing collections does not retain the previous collection's count.

The desktop was recaptured after the typography change and compared with the source in the same combined input. Mobile and tablet were recaptured after their control-spacing fixes. Build/reload troubleshooting was not counted as a visual QA iteration.

## Required fidelity surfaces

| Surface              | Assessment                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fonts and typography | Instrument Sans and italic Instrument Serif reproduce the intended contemporary/editorial pairing. The heading stays on two deliberate lines, with real editable text, close display tracking and readable UI weights. Focused comparison inspected the mark, glyph forms and scale. Small differences from the generated mock's letterforms are accepted.                                                                            |
| Spacing and layout   | Warm, open two-column desktop composition; prominent sculpture; narrow footer rule and quiet secondary navigation. Verified 1487 px desktop, 1363 px browser, 820 px tablet, 390 px phone and 320 px narrow phone. No horizontal overflow observed at the inspected narrow/tablet widths. Mobile uses normal vertical scrolling, with footer below the initial fold.                                                                  |
| Colors and tokens    | Paper `#f7f5f1`, near-black ink, orange mark/status and restrained gray supporting text match the reference's balance. Focus/selected states remain clearly distinguishable.                                                                                                                                                                                                                                                          |
| Image quality        | Generated ceramic/prismatic sculpture and orange paired-loop mark are actual raster assets, separate from the HTML. No placeholder illustration or custom vector substitute. All of the sculpture stays in frame; soft edge feathering integrates the studio background. Social card was inspected at 1200 × 630. The asset's exact caustics and loop contours differ slightly from the mock, an accepted standalone-asset variation. |
| Copy and content     | Main heading, “For humans. For AI.”, “Coming soon”, contact and Side quests links match the selected direction. All 11 products and original buy URLs were compared with Git snapshot 86633db. Visible legacy company/location claims are removed. Original vendor URLs retain their historical account handles.                                                                                                                      |

## Functional verification

- Browser navigation through the landing page, merch collection and mug product page.
- Dresses filter displays exactly three matching items; Everything restores 11. Surprise me changes the visible order.
- Gallery thumbnail swaps the main product image; native product specifications expand.
- Motion pause changes the accessible pressed state and label; enabling restores the interaction.
- Artwork ArrowRight and Enter controls work; activation updates the live announcement. Pointer interaction is implemented and reviewed alongside the keyboard behavior.
- Contact and vendor destinations inspected without submitting forms or placing orders.
- Browser console checked: no application errors observed. The cloud browser extension emitted its own metadata-transport errors; those were separate from the site.
- Five regression tests pass; strict TypeScript and production build pass. The artifact verifier validates all 28 HTML pages, local assets/links, JSON-LD and canonical domain. Total production JavaScript: 11,555 bytes before compression.
- The cloud browser does not expose WebGL. Its image fallback was exercised. Separately, both shader stages compiled and linked in a Mesa GLES context; neutral and interaction frames rendered with no GL errors and a measurable pixel difference. This verifies the shader program, not real Safari or Apple GPU performance.

## Follow-up polish and test limits

- **P3:** Several inherited product images are low resolution. Higher-resolution owner-supplied photos would improve large product views; originals were retained to avoid misrepresenting merchandise.
- **P3:** The standalone hero has quieter ground caustics than the reference. This preserves the material language and avoids adding a large decorative overlay solely for pixel matching.
- Physical iPhone/Mac Safari, VoiceOver, OS-level reduced-motion switching and real Apple GPU performance have not been tested in this environment. These are documented device-validation limits, not claims of completed hardware testing.
- No independent mobile mock was supplied; responsive layouts follow the approved desktop direction.

## Implementation checklist

- [x] Selected visual reference and separate generated assets retained.
- [x] Combined full-view and focused comparisons inspected.
- [x] Reported P2 design/interaction issues corrected and checked again.
- [x] Desktop, tablet, phone, catalog and product views inspected.
- [x] Primary interactions and console reviewed.
- [x] Production build, source documentation and rollback guidance complete.
