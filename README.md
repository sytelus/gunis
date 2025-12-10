# Gunis
Static site for Gunis built with Hugo extended v0.145.0.

## Fresh setup (first clone)
- Clone with submodules so the theme is present: `git clone --recursive <repo-url>` (or run `git submodule update --init --recursive` after cloning).
- Verify Hugo extended is installed and at least v0.145.0: `hugo version`.
- From the repo root, start the dev server (shows drafts): `hugo server -D` and open the printed localhost URL.

## Add new content
- From the repo root run `hugo new content/portfolio/<slug>.md` to scaffold a page with front matter.
- Drop product images in `static/img/portfolio/<slug>/` and point the `image` field in the new file at the hero asset.
- Update title/description as needed and set `draft = false` when the page is ready to publish.

## Preview before deploy
- Start the live server (includes drafts) with `hugo server -D`.
- Open the localhost URL Hugo prints (default `http://localhost:1313/`); it hot-reloads on save. Stop with `Ctrl+C`.

## Deploy to website
- Build an optimized production bundle: `hugo --gc --minify --cleanDestinationDir`.
- The generated site lives in `public/`; sync that directory to your host (e.g., S3, GitHub Pages, or your web root at gunis.ai).
- If you later add a `deployment` target to `hugo.toml`, you can deploy directly with `hugo deploy --confirm`.

## Notes
- Keep `baseurl` in `hugo.toml` pointing at `https://www.gunis.ai/` so links and assets resolve correctly.
- Run all commands from the project root.
