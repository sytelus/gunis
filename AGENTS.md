# Maintainer instructions

## Product boundaries

- Canonical brand and URL: Guni, https://guni.ai.
- Public purpose: advancing learning technologies for humans and AI. First products: geometry puzzle games, then a math learning app, for iPhone and iPad. Do not invent features, launch dates, customers, partnerships or claims.
- Keep the homepage concise and preserve the selected design in `design/selected-reference.png`.
- Keep hosting on GitHub Pages. Do not introduce a backend, hosted form, tracker or different deployment provider without an explicit requirement.
- The site is the public company website of **Gunis LLC** (Washington LLC), which operates the guni.ai brand. Every page names the operator and links About, Contact and Privacy; Apple's organization enrollment depends on this. Publish public-record facts only: no street address or phone number.
- Contact is `/contact/` with shital@guni.ai; shital.com is the founder's site. Merch stays secondary and checkout remains on the original vendors.
- Describe apps honestly as in development until they ship; never add launch dates, downloads, customers or claims that are not true. Do not reintroduce Seattle or the former small-shop positioning.

## Editing

- Read `README.md` and the relevant documentation under `docs/` first.
- Edit `src/`; do not edit generated root HTML or `dist/`.
- Preserve real HTML navigation and the static image fallback. JavaScript enhances the experience.
- Keep the artwork accessible by keyboard and respect reduced motion. The owner removed the pause button: motion must settle after a brief idle period, with Escape available to settle it immediately.
- Avoid GPU vendor fingerprinting. Capability and observed performance determine enhancement.
- Use the committed brand assets, local fonts and Phosphor icons. Retain source artwork and licenses when changing assets.
- Follow strict TypeScript and the committed Prettier configuration. Explain non-obvious rendering, accessibility and deployment choices in comments.
- Keep changes scoped, readable and dependency-light. Add meaningful regression coverage for new behavior, not tests that merely copy implementation.

## Verification and release

Run `npm run format:check`, `npm test`, and `npm run build`. Check affected pages in a real browser at phone and desktop widths. For artwork changes, run `npm run test:browser` and inspect both WebGL and image fallback, hover/touch, idle settling, reduced motion, and keyboard interaction. Update `design-qa.md` and maintenance docs when behavior or design changes materially.

The `main` branch publishes through GitHub Actions. Preserve history; do not force-push or rewrite the original storefront snapshot. Keep a concrete, reviewed change ready before any release approval required by the active user instructions.
