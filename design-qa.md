# Design QA

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
