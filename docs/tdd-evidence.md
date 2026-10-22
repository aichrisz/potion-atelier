# Verification and TDD evidence · Potion Atelier v1.0.0

## Initial Astra checkpoint (historical, superseded)

Implementer session `20261022_064908_288738`, exact model `gpt-6-astra` (confirmed from the read-only session store). Probe session `20261022_063757_947cf1` returned `ASTRA_READY`. No model fallback or global configuration change.

1. `tests/engine.test.cjs` preceded `engine.js`: `node --test` failed exit1, then the minimal engine passed. Raw `artifacts/red-start.log`, `green-start.log`.
2. `tests/brewing.test.cjs` preceded the full ingredient/heat/stir/serve/progress implementation. Unit command failed exit1, then passed: `red-brewing.log`, `green-brewing.log`. This was a **grouped domain slice**, not a separate RED cycle for each individual method.
3. Browser tests preceded controller/view. HTML/CSS scaffold already existed when RED ran, with Start disabled. `npm run test:e2e` failed exit1, then controller/view made the real brew path green: `red-ui.log`. Do not claim the HTML scaffold or delivery helpers were authored with strict test-first discipline.
4. Initial worker reported10unit/5browser and a first offline render. Those were a checkpoint, not final acceptance; offline serving, accessibility and the complete edge matrix were still outstanding then.

## Parent regressions and correction

- `tests/parent-boundary.test.cjs`: actual reader test initially failed because a symlinked serving root could redirect the allowlisted read. Existing private-path/file-symlink cases passed. Astra added root refusal; the original failing test then passed. Fixture data is synthetic, never an actual secret.
- `tests/parent-build-boundary.test.cjs`: safe cwd-independent build passed while `dist/assets` redirect refusal failed (exit1; builder returned0 and overwrote a synthetic sentinel). Parent read the builder and isolated unchecked output ancestors before requesting a targeted Astra correction. Same implementer resumed, **only** `scripts/build.cjs` changed. It now walks every output directory with `lstat` before mkdir/write and refuses symlink/dangling/non-regular targets. Both boundary tests and the full16unit suite then passed; parent independently reran them.
- Parent property/browser checks are **coverage expansion**, not retroactively claimed RED-first TDD. The first scratch property run used an incorrect assumed `order.recipeId` adapter; inspecting the actual public snapshot showed `order.id`. Correcting the harness fixed that contract mismatch, not production scoring. It is not reported as a game regression.
- Browser-loop instrumentation was moved **after** Playwright clock initialization and required positive observed callback counts. An all-zero callback report was rejected as vacuous evidence. Exactly one continuing chain and zero pending callbacks in inactive phases were then observed.
- An edge-harness completion run initially timed out while simulating thousands of render/layout frames with `clock.runFor(181000)`. It was changed to `runFor(32)` after resume, then `fastForward(181000)`, which tests the real large-delta finish without redundant frames. No game rules were weakened.
- Source was formatted for readability with installed Prettier3.9.5. SVG needs explicit `--parser html`; the first generic formatter command exited2 and therefore did **not** launch its `&&`-chained correction worker. Parent checked that failure and launched the actual targeted correction separately (`proc_f51e05d1c9e9`). No duplicate writer was started.
- Context-fresh reviewer `20261022_073822_1b9b63` returned **fix-first**, identifying a dangling output-file symlink in the exporter and a false durable-save confirmation after a quota failure. Parent reproduced both before fixing: `parent-export-boundary.test.cjs` failed (export returned0); `storage-result.spec.cjs` had one expected failure while the successful-write control passed. Minimal lstat/type checks and a visible result-modal save status made both original regressions green. The full acceptance was then rerun, not merely the two targeted tests.

## Final parent acceptance (2026-10-22)

Actual raw outputs: `artifacts/acceptance/`; consolidated machine-readable `gate.json`. This supersedes worker checkpoint counts.

- Initial `npm ci --ignore-scripts` completed; final clean reinstall used `npm ci --offline --ignore-scripts --no-audit` against the same pinned lock/cache, followed by a separate explicitly cached audit. Syntax/allowlist, build and standalone export succeeded.
- **17/17 unit tests**, zero failure/skip.
- **9/9 Playwright tests**, zero unexpected/flaky/skipped, including the actual visible result dialog for both successful and quota-denied writes.
- Axe WCAG2A/AA/2.1AA + best-practice on ready, heating, stirring, bottled, paused, results; no exclusions and zero violations. The clock was resumed for axe's internal timers and paused at a future browser timestamp afterward.
- **12/12 standalone edge scenarios**: six viewports320/390/768/1024/1366/1440 (DPR2,390touch-emulated), corrupt/oversized/denied/adversarial storage, no-JavaScript, reduced-motion essential play. Each viewport exercised actual brew, pause/results geometry and storage reload. Active recipe, instrument and primary action fit actual laptop/phone viewports, not only full-page screenshots.
- Source, built dist and actual offline standalone each served **all six real recipes** with100quality/184coins, then a wrong mixture with40quality/0coins. Native keyboard/pointer controls, actual fire/temperature, stirring, duplicate-serve rejection, pause/blur, completed profile and next shift were exercised. Seven dist files matched source. Offline requested only its own HTML document, zero neighboring/external resources, zero application errors.
- Independent60mixed-input domain runs checked exact reward/quality/reputation invariants and once-only finish. Actual loop callbacks were observed, maximum one continuing chain, none pending at results.

## Audit freshness limitation

The initial online-enabled clean install reported `audited5packages` and `found0vulnerabilities`. A separate online `npm audit --json` timed out (first process after240seconds; bounded retry exit1 network timeout at the npm security bulk endpoint). A real `npm audit --json --offline --fetch-retries=0 --fetch-timeout=15000` then succeeded with zero findings for the four dev packages, recorded as `audit-cache.log`. **This is cached advisory evidence, not a successful fresh online audit.** Runtime dependencies are zero. `verify` now bounds the online attempt; `verify:offline` explicitly uses cache rather than silently presenting it as fresh data.

Physical devices, Safari/Firefox and manual screen-reader equivalence remain untested. Automated accessibility is not a claim of full nonvisual timed-game equivalence. A context-fresh Astra review is a separate gate, not the implementer's self-report.
