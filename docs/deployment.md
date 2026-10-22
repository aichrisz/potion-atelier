# Potion Atelier — GitHub Pages deployment

## Authorization and topology

Abel explicitly requested “push dan deploy coba” after the local release. Public repository: https://github.com/aichrisz/potion-atelier. Playable site: https://aichrisz.github.io/potion-atelier/.

- Original source/tag `v1.0.0`: `1b534e2ac2598656057e58ab779cc20d54180918`.
- `main` contains source/tests/docs. Later documentation commits do not move the release tag.
- Orphan `gh-pages` deployment: `bf4471eb373470d69f28f310445682f7d0db9e0c`.
- Explicit Pages source: `gh-pages`, root `/`, legacy branch build; HTTPS enforced.
- Exactly seven runtime files plus empty `.nojekyll`: `index.html`, `styles.css`, `engine.js`, `view.js`, `app.js`, `assets/atelier.svg`, `assets/mark.svg`. No tooling/tests/docs/credentials served as runtime.
- Relative asset URLs work on the `/potion-atelier/` project subpath; no backend or build-base rewrite needed.

## Publication evidence — 2026-10-22

- Preflight inspected all 34 tracked files, 34 history blobs and three source commits: no prohibited secret paths or configured credential-pattern matches. This is a bounded scan, not a guarantee that every possible secret format is detectable.
- Fresh syntax/allowlist, build, 17 unit and 9 Playwright tests passed. Zero unexpected/skipped/flaky browser tests.
- Online `npm audit --json --fetch-retries=0 --fetch-timeout=15000` succeeded and reported zero vulnerabilities. This supersedes the earlier local-only cached-audit limitation for this publication checkpoint.
- Remote source/tag/Pages refs read back. Pages latest build returned `built` with the exact deployment SHA. HTTPS enforced; all seven public file bodies byte-match `dist/` and return HTTP 200.
- Two independent public-site play-throughs: Chromium desktop 1440×900 with native keyboard/pointer; mobile 390×844 with emulated touch/taps (not physical-device testing). Each served six unique recipes at quality 100 for 184 coins, then an incorrect mixture at quality 40 for zero coins.
- Both public cases exercised actual controls, fire/temperature, stirring, duplicate-serve prevention, pause/frozen clock, blur/resume, results, saved completed profile and clean next shift. Zero application errors/failed requests; controls fit the viewport without horizontal overflow. One maximum active animation chain; none pending at results.
- Public all-recipe cases use a synthetic valid completed profile to expose every real recipe; production live state is never patched. New profiles still begin with the normal three unlocked recipes.

Machine-readable reports remain local under ignored `artifacts/`: `publication-preflight.json`, `publication-live-files.json`, `github-pages-deployment.json`, `parent/public-desktop-browser-report.json`, `parent/public-touch-browser-report.json`. Existing offline deliverables and source ZIP match the immutable original v1.0.0 source, not later documentation-only commits.

## Repeat / recovery

1. Check exact source diff, scan history and run `npm run verify` plus `npm run build`.
2. Copy only the seven allowlisted `dist/` files into a dedicated deployment checkout, add `.nojekyll`, inspect its exact tracked list, commit.
3. Push the intended SHA/HEAD to `refs/heads/gh-pages`; do not force-push an unrelated branch or publish the whole source root.
4. Read back the remote ref, Pages source, HTTPS and exact latest-build SHA. Verify every public asset body and a real input→payment→pause→results path on the public project URL.

This is the first deployment, so no older public release exists to roll back to. Preserve the known-good deployment SHA above as the rollback anchor for future updates. Reverting a future broken Pages commit onto that runtime tree and pushing a new commit restores these exact files without force-push. If the first release itself must be withdrawn, unpublishing Pages is a separate destructive visibility action requiring explicit approval; do not delete the repository or change other sites.

No global model/provider/service/routing changes, paid infrastructure, custom domain, tracking or user-data migration were introduced.
