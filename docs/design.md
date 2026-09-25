# Learning Upgraded

## Identity

The linked loops suggest reciprocal learning: different forms in continuous exchange. Warm ceramic and refractive glass keep the human and technological readings suggestive. The owner-selected Linked G concept in `design/concepts/guni-linked-g-v4.png` is installed for website testing: two tilted orange rings and a pale peach-orange detached dot, with the middle arc removed. It refines the owner's supplied sketch, retained beside it. The lowercase `guni.ai` wordmark makes the name explicit. The runtime asset is a cropped and resized version of the actual generated proposal, not a production vector master; the original two-ring source remains intact for rollback.

The landing page leaves space for discovery. Its primary copy is “Learning / Upgraded.”, “For humans. For AI.” and “Coming soon”. The shared footer tagline is “A billion small brains > one giga brain”, replacing “A little curiosity goes a long way.” The orange comparison sign connects the tagline to the brand accent. The startup's explicit learning-technologies purpose lives in metadata without introducing unannounced features. The footer link is simply “Merch”. “Say hello” links to the founder's website.

## Living light

The page is a quiet studio in which the sculpture is the light source and the visitor's hand is the lamp. The organizing idea is the tagline: a billion small brains. A swarm of tiny glass motes lives invisibly in the page; it appears only where it is stirred, learns from the visitor, and at its peak forms the loop of learning itself.

- **Arrival.** The copy rises into place. The loop exhales a breath of light: motes are born on its centreline and drift outward while a prismatic sweep crosses the glass. The status dot pings twice and the hint's arrows nudge. Then everything rests, and the resting page is the selected design (with the reference's warm floor light restored).
- **Lead.** Moving anywhere stirs a wake of motes that swirl in a curl-noise current and stream toward the sculpture, replacing the earlier SVG trail. Over paper they are deep vermilion, violet, teal, amber and rose; over the sculpture they turn into spectral sparkles. The stream retires once the figure has been explored.
- **Serendipity.** Over the figure the light follows the pointer: the ceramic is relit, the glass throws specular and iridescent colour, a droplet lens magnifies under the pointer and ripples spread. Tilting a phone moves the same light, parallax and glints; a swell passes through “Learning”, and “Upgraded.” catches a foil-like prismatic band. The heading also answers a hovering pointer.
- **Play.** A press gathers motes into a vortex that follows the finger while “Upgraded.” shimmers; release bursts them outward with a flash. A shake scatters them like a snow globe.
- **Anticipation.** The swarm levels up. Once the figure is found, motes that reach it flow along the figure-8. With more play they start to lead the pointer instead of following it. Drawing a loop around the sculpture, swirling a phone, pressing four arrow keys in a circle, or simply playing long enough triggers the upgrade: the swarm traces the loop in a turning spectrum, light runs along it and passes behind the glass at the crossing, “Upgraded.” flashes, the mark spins, and the swarm bursts free. The glass stays slightly richer for the rest of the visit.

There are no instructions beyond the fixed “A little curiosity” hint; the accessible label on the artwork keeps the explicit guidance. Motion always settles after inactivity and stays off for reduced-motion visitors.

Visibility rules: stirred motes must be easy to see. On paper use deep chromatic cores (never pale dust) and let only energy, not a global fade, decide visibility. Over the artwork and in the loop formation use saturated spectral light with a four-ray glint and a warm halo, never dark specks. Keep motes fine (about 1–2.5 CSS pixels plus motion streak) and the arrival exhale focused on the sculpture rather than covering the page. The SVG fallback keeps the earlier rules: dark coloured cores with a warm halo, 1.6–2.5× shape scale, 82–100% opacity through the main flight and a 380–650ms lifetime.

Small rewards: the mark turns playfully on hover, link arrows launch and return, the tagline's orange comparison sign pops on hover. All of them are finite.

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

`design/selected-reference.png` is the original design selected by the owner. The sculpture, original transparent orange mark and original social card in `design/assets/` were generated for this project using the available GPT image-generation tool. A model identifier was not exposed. The owner's September 2026 revision changes the copy, wordmark and interaction while preserving the composition. The subsequent Linked G proposal was generated from the owner's sketch; its prompt and provenance are in `design/concepts/guni-linked-g-v1.md`. `scripts/prepare-assets.mjs` exports that selected concept to the runtime PNG and site icons. The header PNG is exported with a real alpha channel (colour-to-alpha against the raster's own near-white background) because the header's stacking context stopped `mix-blend-mode` from reaching the page paper, leaving a visible light square; the favicon and touch icon are unchanged. The current social card is rendered from real site HTML using `npm run prepare:social`, so its copy and fonts match the page. The original generated assets remain for provenance.

The source screenshot is a visual reference, not the runtime page. All headings and interface text are real HTML. The hero is a separate image with optional shader enhancement. Its soft studio background is feathered into the page; the artwork does not pretend to be a fully three-dimensional model. Its relighting uses a data map derived from the same artwork by `scripts/sculpture-maps.mjs`: a matte from the uniform studio backdrop, an inflation height from the silhouette's distance transform, and the position along a centreline traced by hand in `src/data/loop-path.json`. The map is image processing of the committed source, not generated imagery.

The implementation preserves the reference's subjects, palette, typography pairing and composition. Slight differences in glass caustics and loop contour arise from generating a standalone asset; retain the same material language when producing a future replacement.

Product images come from the original repository, with their original purchase destinations and descriptions retained. Do not regenerate them as aesthetic substitutes for real merchandise.
