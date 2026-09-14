# Learning Upgraded

## Identity

The linked loops suggest reciprocal learning: different forms in continuous exchange. Warm ceramic and refractive glass keep the human and technological readings suggestive. The owner-selected Linked G concept in `design/concepts/guni-linked-g-v4.png` is installed for website testing: two tilted orange rings and a pale peach-orange detached dot, with the middle arc removed. It refines the owner's supplied sketch, retained beside it. The lowercase `guni.ai` wordmark makes the name explicit. The runtime asset is a cropped and resized version of the actual generated proposal, not a production vector master; the original two-ring source remains intact for rollback.

The landing page leaves space for discovery. Its primary copy is “Learning / Upgraded.”, “For humans. For AI.” and “Coming soon”. The shared footer tagline is “A billion small brains > one monster brain”, replacing “A little curiosity goes a long way.” The orange comparison sign connects the tagline to the brand accent. The startup's explicit learning-technologies purpose lives in metadata without introducing unannounced features.

The sculpture follows pointer movement with light and perspective. A brief wake of slivers, shards, filaments, dust and glints tumbles toward it from the pointer. The fragments catch warm gold, muted violet and cool blue light as they move along independent curves; no continuous guide lines are drawn. Each lasts 380–650ms of animation time. The particles retire after sustained exploration inside the sculpture, an intentional click/touch, or keyboard activation. A brief boundary crossing only hides them temporarily: slow movements and direction changes outside the figure must remain responsive. The quiet “A little curiosity” hint uses the original horizontal-arrow cue, with no reactive instructions explaining the discovery. Motion settles after inactivity and remains off for reduced-motion visitors. The footer link is simply “Merch”. “Say hello” links to the founder's website.

Particle visibility is intentional: use dark colored cores with a warm halo, 1.6–2.5× shape scale, and 82–100% opacity through the main flight. Only the first 8% and last 20% of the lifetime fade. Do not soften the entire effect into pale dust; the owner explicitly needs it to be easy to see. Preserve the short lifetime and dismissal after discovery.

## Typography and tokens

| Element          | Choice                           | Purpose                                                      |
| ---------------- | -------------------------------- | ------------------------------------------------------------ |
| Primary family   | Instrument Sans, variable weight | Clear, contemporary structure and interface legibility       |
| Display contrast | Instrument Serif, italic         | Expressive, literary rhythm in the headline and short asides |
| Paper            | `#f7f5f1`                        | Warm studio background                                       |
| Ink              | `#121416`                        | Strong type contrast                                         |
| Secondary type   | `#666460`                        | Quiet supporting UI                                          |
| Accent           | `#df4722`                        | Interaction/focus color, related to the orange brand mark    |
| Rule             | `#d1cec7`                        | Fine footer and collection dividers                          |
| Icons            | Phosphor, light weight           | Restrained navigation and motion controls                    |

Fonts are self-hosted WOFF2 files with swap fallbacks; their SIL Open Font Licenses are included. Phosphor's MIT license is included. Large display text uses close optical spacing; product descriptions keep a readable line height. The small serif appears only as short expressive copy, not dense specifications.

## Source and runtime assets

`design/selected-reference.png` is the original design selected by the owner. The sculpture, original transparent orange mark and original social card in `design/assets/` were generated for this project using the available GPT image-generation tool. A model identifier was not exposed. The owner's September 2026 revision changes the copy, wordmark and interaction while preserving the composition. The subsequent Linked G proposal was generated from the owner's sketch; its prompt and provenance are in `design/concepts/guni-linked-g-v1.md`. `scripts/prepare-assets.mjs` exports that selected concept to the runtime PNG and site icons. The current social card is rendered from real site HTML using `npm run prepare:social`, so its copy and fonts match the page. The original generated assets remain for provenance.

The source screenshot is a visual reference, not the runtime page. All headings and interface text are real HTML. The hero is a separate image with optional shader enhancement. Its soft studio background is feathered into the page; the artwork does not pretend to be a fully three-dimensional model.

The implementation preserves the reference's subjects, palette, typography pairing and composition. Slight differences in glass caustics and loop contour arise from generating a standalone asset; retain the same material language when producing a future replacement.

Product images come from the original repository, with their original purchase destinations and descriptions retained. Do not regenerate them as aesthetic substitutes for real merchandise.
