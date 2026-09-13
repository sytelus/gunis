# Deployment, write access and recovery

## GitHub Pages publishing

The repository remains [sytelus/gunis](https://github.com/sytelus/gunis). `.github/workflows/pages.yml` replaces the original Hugo workflow. GitHub Pages should use **GitHub Actions** as its publishing source and **guni.ai** as its custom domain, as in the existing setup.

A push to `main` (or a manual workflow dispatch on `main`) runs:

1. Checkout and Node.js 24 setup with npm caching.
2. `npm ci`, `npm test`, and `npm run build`.
3. Upload `dist/` as the Pages artifact.
4. Deploy using the `github-pages` environment.

The build job has read-only repository contents permission. The deployment job has `pages: write` and `id-token: write`. No custom deploy key, personal token, server, Hugo installation or manually copied `public/` directory is required. Pull requests verify the same build and do not deploy. If environment protection rules require approval, GitHub will hold the deployment at that gate.

`public/CNAME` is copied to the output and contains `guni.ai`; `.nojekyll` is preserved. DNS and redirects from other domains are managed outside this codebase. Retain those settings and HTTPS enforcement. See the [GitHub Pages custom-domain documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages).

## Repository write access

Repository permission and Git authentication are separate. A connected GitHub app may have access while a terminal clone has no credential helper, so a failed terminal push alone does not establish read-only repository permission.

For a maintainer's own machine, use the GitHub CLI's interactive authentication or a registered SSH key. For example:

```sh
gh auth login
gh auth setup-git
git push origin your-branch
```

Complete credential entry in the official authentication flow. Do not put a token in this repository, a remote URL, shell history or chat. The GitHub account must have repository write permission; an organization may also require SSO authorization.

For a connected GitHub app, the repository must be included in the installation and the connection must allow contents writes. Changes to `.github/workflows/` may require additional workflow permission beyond ordinary file writes. Check the app's actual error if a workflow update is rejected. An admin indicator from a repository read is not proof that a write succeeded.

The useful access test is a real, reversible branch creation or commit, followed by reading the resulting ref. Do not use a force-push as a permission test.

## Before and after a release

Run the checks in [maintenance.md](maintenance.md), inspect the concrete diff and publish through a normal commit/merge. Verify the Actions run succeeds and the live homepage and a product route show the intended version. Confirm `/sitemap.xml`, `/robots.txt`, the canonical URL and one legacy redirect. A successful build alone is not proof of successful deployment.

## Rollback

The complete pre-revamp snapshot is [`86633dbb82f43ef509e933a7ebd835a441d0e79c`](https://github.com/sytelus/gunis/tree/86633dbb82f43ef509e933a7ebd835a441d0e79c). History is retained; do not rewrite it or force-update `main`.

For an isolated bad release, create a recovery branch from current `main`, then revert the release commit and review the diff:

```sh
git switch main
git pull --ff-only
git switch -c restore-previous-release
git revert <release-commit-sha>
git push -u origin restore-previous-release
```

Merge the reviewed recovery change using the normal repository process. Reverting the initial revamp restores the old workflow and source as well as its content, so the publishing stack changes back to Hugo. Inspect the restored workflow and its build requirements before merging. A revert can conflict if later changes touch the same files; resolve those explicitly.

To inspect the original storefront without altering current work:

```sh
git worktree add --detach ../guni-original 86633dbb82f43ef509e933a7ebd835a441d0e79c
git -C ../guni-original submodule update --init --recursive
```

The original commit itself remains the authoritative backup even if a convenience archive branch is later renamed or removed.
