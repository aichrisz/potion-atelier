# Potion Atelier Implementation Plan

> **For agentic workers:** Use the user-selected Astra worker to execute these coupled vertical slices with TDD; parent retains independent acceptance and a context-fresh review. The approved cozy-game concept is formalized in ../specs/2026-10-22-potion-atelier-design.md. No additional design interview or public deployment.

**Goal:** Deliver a real offline cozy potion shop with one180-second repeatable shift, six recipes/unlocks and three actual brewing stages.

**Architecture:** Pure deterministic engine owns orders/quality/coins/progress; stable native HTML/SVG view reads detached snapshots; controller owns clock, input, focus and safe storage. Classic scripts support source file:// and single-file export without a framework.

**Tech Stack:** HTML/CSS/vanilla JS/SVG; Node built-ins; dev-only Playwright1.64.1/axe4.14.0; local Chromium.

## Global constraints
Approved spec's exact content/rules/storage/lifecycle/accessibility/boundary/delivery requirements apply unchanged. Work only in /root/projects/potion-atelier; exact gpt-6-astra, no fallback, global config, other-project writes, paid assets, credentials, commit or deploy by worker. Parent commits after review. Runtime dependencies zero. Seven runtime allowlisted files; test server127.0.0.1:4186. Warm illustrated workbench, not a recolored Ranoa arcade.

## File map / interface contract
- engine.js: frozen INGREDIENTS/RECIPES, profile sanitation, deterministic create({seed,profile}); startShift/pause/resume/step/toggleIngredient/resetBrew/setHeat/advance/snapshot/profile. state phases ready/running/paused/results; stages ingredients/heating/stirring/bottled. Exact formulas and six recipes copied verbatim from spec.
- view.js: stable DOM/SVG presentation and recipe/progress/feedback rendering; consumes snapshot/profile, no money/time/progress writes. Native DOM retains focus during frame updates.
- app.js: creates engine/view; native event bindings, one active-only rAF clock, explicit resume after blur/hidden, localStorage allowlist/schema, important announcements and focus. No live-game test hook.
- index.html/styles.css/assets/{atelier,mark}.svg: original cozy illustrated layout, selected ingredients, actual customer/recipe, fire/heat and stir bands, bottled quality/serve, recipe ledger and shift results; responsive and keyboard-ready.
- scripts/public.cjs, server.cjs, build.cjs, export.cjs, package.py (or equivalent names): common root/allowlist/symlink boundary; safe build/export and explicit complete source packaging.
- tests/engine.test.cjs; tests/e2e/game.spec.cjs + delivery.spec.cjs; package/lock/playwright config/.gitignore, README.md, docs/tdd-evidence.md, ignored artifacts reports and actual screenshots.

## Task1 — Pure brewing and progression tracer bullets
**Files:** engine.js and tests/engine.test.cjs; package setup folded into this task.

- [ ] Write/run failing startShift test before engine exists; implement minimum and run green. Concrete first assertion:
```js
const game = Engine.create({seed:1});
game.startShift();
assert.equal(game.snapshot().phase,'running');
assert.equal(game.snapshot().remaining,180);
assert.equal(game.snapshot().stage,'ingredients');
assert.equal(game.snapshot().unlockedCount,3);
```
- [ ] Add/run ingredient validation test before implementing toggles/advance. Required behavior: invalid ID/inactive rejected atomically; exactly3unique ingredients advance to heating; fewer3 and fourth unique do not mutate progress/money. Snapshot mutation cannot change live state.
- [ ] Add/run heat test before step/setHeat: power0..100 native numeric finite inputs only, actual analytical temperature update20..100, minimum1active second before lift; paused/invalid dt cannot heat. Use tolerance for floating arithmetic, not for integer money/profile bounds.
- [ ] Add/run stir/bottle test before advance: needle triangle0..100 period2.4, minimum0.25active seconds; sample actual position and captured temperature, compute ingredient60/heat20/stir20 and reward/reputation exactly. Bottle is not serve.
- [ ] Add/run serve atomicity test: first serve credits one order/reward, resets only brew; immediate duplicate advance rejects; wrong ingredients max40 and reward0; reputation clamp0..100.
- [ ] Add/run finish/progress tests: large dt clamps to180, partial brew not paid, completedShifts increments once, unlock3→4→5→6 only, next shift resets active stats but preserves profile, zero-order average0, profile malformed/oversized/nonfinite/negative/wrong version safe defaults, no trusted stored unlock arrays.
- [ ] Run npm run test:unit; document exact API. Use same engine for all tests/UI; never implement alternate test rules.

## Task2 — Actual browser brewing cycle
**Files:** index/styles/assets/view/app and tests/e2e/game.spec.cjs, dev server/config.

- [ ] Write/run a browser test failing on missing Start before UI code. Concrete path: navigate `/`, activate real start button, assert phase Berlangsung and180s, read actual first recipe/ingredients.
- [ ] Implement native three-ingredient selection→heat fire slider→observed actual temperature band→stir indicator→bottle quality→serve reward and real next customer. Use real inputs and actual clock progression, not a forced snapshot. Add browser tests for this vertical path before controller behavior.
- [ ] A keyboard-only path uses Tab/native Space/Enter, range Home/End/arrows and primary controls; do not call locator.fill on range inputs. Test P/Escape after clicking a native control, paused state/mana-equivalent heat/needle freeze, explicit resume, visibility/blur, and zero duplicate credit from native activation.
- [ ] Test full180s completion with Playwright controlled clock/fastForward after a real first frame; next shift unlocks first new recipe. Test storage roundtrip and denied/corrupt storage, repeated results do not inflate completed count. No test-only query route or mutable window game state.
- [ ] Keep actual recipe/temperature/stir/phase values accessible in DOM for users and assertions (IDs/data attributes fine); never fabricate test actions. Show live success/failure feedback and actual quality breakdown.

## Task3 — Offline/responsive delivery gate
**Files:** build/export/package scripts, tests/e2e/delivery.spec.cjs, README and TDD evidence.

- [ ] Add failing export test for computed styling and ZERO neighboring resources before exporter implementation; tolerate `<link ...>` and `<link ... />` source formatting and require exactly one replacement. Verify all SVG/image/scripts truly embedded; file:// controls must serve a real potion, not only show title text.
- [ ] Add native no-JS test: explanatory text containing memerlukan JavaScript and disabled Start until initialization succeeds.
- [ ] Check320/390/768/1024/1366/1440 widths, DPR2 and mid-brew resize. Actual viewport checks ensure stage instrument/action visible together at1366x768 and390x844 after scrolling bench to top; screenshot full-page alone is insufficient.
- [ ] Axe WCAG+best-practice ready/running/paused/bottled/results, without rule exclusions. Temporarily resume fake browser clock for axe's internal timers, then pause at a future timestamp. Reduced motion stops rain/ornaments, not essential cooking/stir logic; pause stops all active simulation and decorative motion.
- [ ] Test source, built dist and offline exported game through real inputs; no console exceptions/HTTP failures/external requests. Private paths/symlinks denied and build root does not depend on cwd.
- [ ] Run npm run check, test:unit, test:e2e, build/export, npm test, npm audit and source packager; preserve real logs/counts under artifacts. Actual screenshots artifacts/desktop-ready.png, desktop-playing.png, mobile-ready.png, mobile-playing.png and results if useful.
- [ ] README documents actual mechanics/architecture/controls/progress-save semantics/commands/limits. docs/tdd-evidence.md separates observed red-first cycles from later coverage expansion. Worker returns real outcomes; parent verifies and requests corrections/fresh review before commit/delivery.
