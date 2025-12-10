# Gunis
Static site for Gunis built with Hugo extended v0.146.0.

## Fresh setup (first clone)
- Clone with submodules so the theme is present: `git clone --recursive <repo-url>` (or run `git submodule update --init --recursive` after cloning).
- Verify Hugo extended is installed and at least v0.146.0 (Hugo Narrow requires this): `hugo version`.
- From the repo root, start the dev server (shows drafts): `hugo server -D` and open the printed localhost URL.

## Add new content
- From the repo root run `hugo new content/portfolio/<slug>.md` to scaffold a page with front matter.
- Drop product images in `static/img/portfolio/<slug>/` and point the `image` field in the new file at the hero asset.
- Update title/description as needed and set `draft = false` when the page is ready to publish.

## Preview before deploy
- Quick start: `./view.sh` (runs `hugo server -D --buildFuture --disableFastRender` and auto-fetches theme submodules).
- Manual: start the live server (includes drafts) with `hugo server -D`.
- Open the localhost URL Hugo prints (default `http://localhost:1313/`); it hot-reloads on save. Stop with `Ctrl+C`.

## Deploy (GitHub Pages)
- Deployment is automated via GitHub Actions: every push to `main` triggers `.github/workflows/hugo.yaml` (“Deploy Hugo site to Pages”) which builds with Hugo extended `v0.146.0` and publishes to the `github-pages` environment.
- Custom domain: Settings ▸ Pages is configured to `www.gunis.ai` with “Enforce HTTPS” enabled (keep `baseurl` in `hugo.toml` as `https://www.gunis.ai/`). DNS must point `www` to GitHub Pages; allow time for the DNS check to turn green.
- Manual build (optional sanity check before pushing): `./deploy.sh` or `hugo --gc --minify --cleanDestinationDir`; output lands in `public/` but usually you don’t push `public/`—the action generates it for you.

## Theme toggle
- Theme cascade is set to `["hugo-narrow", "creative-portfolio"]` in `hugo.toml`. To revert to the old look, change `theme` to `["creative-portfolio"]` (or swap the order).
- `hugo-narrow` lives at `themes/hugo-narrow` (submodule). If preview breaks due to Hugo version, upgrade locally to ≥0.146.0 or temporarily switch back to `creative-portfolio`.

## Notes
- Keep `baseurl` in `hugo.toml` pointing at `https://www.gunis.ai/` so links and assets resolve correctly.
- Run all commands from the project root.
