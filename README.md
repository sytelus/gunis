# Guni

The coming-soon website for [guni.ai](https://guni.ai): advancing learning technologies for humans and AI.

**Learning, in a new light.** An interactive ceramic-and-glass sculpture pairs with an orange reciprocal-loop mark, Instrument Sans, and Instrument Serif. A quiet **Side quests / Merch** link opens the preserved product collection; **Say hello** opens [shital.com](https://shital.com).

## Run locally

Use **Node.js 24** (the CI version) and npm. No API keys, database, or environment variables are required.

```sh
npm ci
npm run dev
```

Vite prints the local address. Copy and catalog edits regenerate the HTML automatically; CSS and TypeScript update through Vite. To inspect the actual production artifact:

```sh
npm test
npm run build
npm run preview
```

## How it is built

This is a statically generated, multi-page site. Small Node templates generate complete HTML, then Vite bundles CSS and TypeScript. There is no client-side framework or application server. The landing page, every product, purchase links, and navigation work before JavaScript loads.

| Location                      | Responsibility                                                       |
| ----------------------------- | -------------------------------------------------------------------- |
| `src/pages.mjs`               | HTML templates, visible copy, canonical URLs and structured metadata |
| `src/data/products.json`      | All 11 original products, purchase URLs, descriptions and galleries  |
| `src/catalog.mjs`             | Catalog validation, URL conventions and escaping                     |
| `src/styles.css`              | Shared design tokens, typography and responsive layouts              |
| `src/artwork.ts`              | Optional WebGL refraction, image fallback and motion controls        |
| `src/main.ts`                 | Catalog filtering/shuffling and product gallery enhancement          |
| `scripts/generate.mjs`        | HTML generation, legacy redirects, sitemap and robots.txt            |
| `scripts/verify-build.mjs`    | Deployment-artifact integrity and JavaScript size checks             |
| `design/`                     | Selected visual reference and original generated brand assets        |
| `public/`                     | Committed, optimized assets copied into the deployed site            |
| `.github/workflows/pages.yml` | Verification and GitHub Pages deployment                             |

`dist/` and generated HTML are build outputs, intentionally excluded from Git. Edit their source files instead.

## Publishing

GitHub Actions builds pushes to `main`, checks the catalog and production output, then uploads `dist/` to **GitHub Pages**. Pull requests run the same verification without deploying. The custom domain stays **guni.ai**, recorded in `public/CNAME`. Existing redirects from other domains remain a DNS/domain-provider responsibility.

See [deployment and rollback](docs/deployment.md) for the workflow, write-access setup and recovery steps.

## Maintaining the site

- [Architecture](docs/architecture.md): rendering, routes, graphics, performance and accessibility.
- [Content and assets](docs/maintenance.md): editing copy/products, asset exports, testing and release checks.
- [Brand direction](docs/design.md): symbolism, typography, palette and image provenance.
- [Visual QA](design-qa.md): reference comparison, responsive evidence and verification limits.

Run `npm run format` before committing and `npm run format:check` to check formatting. TypeScript is strict; `npm run check` checks client types. `npm run build` also checks types and verifies the resulting artifact.

## Original website

The previous Hugo storefront remains intact in Git history at [`86633dbb82f43ef509e933a7ebd835a441d0e79c`](https://github.com/sytelus/gunis/tree/86633dbb82f43ef509e933a7ebd835a441d0e79c). It used Hugo layouts/content, theme submodules, committed generated output, and a GitHub Actions Pages workflow. The revamp removes the old implementation and bundled Hugo binaries from the current tree while retaining all 11 products, 23 product images and original vendor purchase URLs.

Font and icon licenses are retained in [docs/licenses](docs/licenses). Brand artwork was generated for this project. Original product imagery is preserved from the repository; no replacement product photography was generated.
