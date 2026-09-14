# Design QA

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
