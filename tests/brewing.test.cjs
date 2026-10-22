const { test } = require("node:test");
const a = require("node:assert/strict");
const E = require("../engine.js");
function start(profile) {
  const g = E.create({ profile });
  g.startShift();
  return g;
}
function heat(g, ids = ["moon-lavender", "dew", "mint"]) {
  ids.forEach((id) => g.toggleIngredient(id));
  a.equal(g.advance().accepted, true);
}
function bottle(g) {
  heat(g);
  g.setHeat(60);
  g.step(2.8);
  g.advance();
  g.step(0.54);
  g.advance();
}
test("ingredient actions are atomic, unique, detached and stage constrained", () => {
  const g = start();
  const before = g.snapshot();
  a.equal(g.toggleIngredient("bad").accepted, false);
  a.deepEqual(g.snapshot(), before);
  g.toggleIngredient("dew");
  a.equal(g.advance().accepted, false);
  g.toggleIngredient("mint");
  g.toggleIngredient("rose");
  a.equal(g.toggleIngredient("star-anise").accepted, false);
  const s = g.snapshot();
  s.ingredients.length = 0;
  a.equal(g.snapshot().ingredients.length, 3);
  g.advance();
  a.equal(g.toggleIngredient("dew").accepted, false);
});
test("heat is analytical, finite and lift requires one active second", () => {
  const g = start();
  heat(g);
  a.equal(g.advance().accepted, false);
  for (const x of [NaN, Infinity, "50", -1, 101])
    a.equal(g.setHeat(x).accepted, false);
  g.step(0.5);
  a.equal(g.advance().accepted, false);
  g.step(0.5);
  a.ok(Math.abs(g.snapshot().temperature - (116 - 96 * Math.exp(-0.1))) < 1e-9);
  g.pause();
  const s = g.snapshot();
  g.step(100);
  a.deepEqual(g.snapshot(), s);
  g.resume();
  g.advance();
  a.equal(g.snapshot().stage, "stirring");
});
test("triangle, minimum stir, exact quality and separate exactly-once serve", () => {
  const g = start();
  heat(g);
  g.step(2.8);
  g.advance();
  a.equal(g.advance().accepted, false);
  g.step(0.54);
  a.ok(Math.abs(g.snapshot().stirPosition - 45) < 1e-8);
  g.advance();
  a.equal(g.snapshot().potion.quality, 100);
  a.equal(g.snapshot().coins, 0);
  g.advance();
  a.equal(g.snapshot().coins, 24);
  a.equal(g.snapshot().reputation, 53);
  a.equal(g.snapshot().served, 1);
  a.equal(g.snapshot().order.id, "kelopak-pulih");
  a.equal(g.advance().accepted, false);
  a.equal(g.snapshot().coins, 24);
});
test("wrong ingredients pay nothing; reset does not rewind time", () => {
  const g = start();
  heat(g, ["rose", "dew", "mint"]);
  g.step(2.8);
  g.advance();
  g.step(0.54);
  g.advance();
  a.ok(g.snapshot().potion.quality <= 40);
  g.advance();
  a.equal(g.snapshot().coins, 0);
  a.equal(g.snapshot().reputation, 46);
  const t = g.snapshot().remaining;
  g.resetBrew();
  a.equal(g.snapshot().remaining, t);
});
test("large dt clamps heat to remaining and completes only once", () => {
  const g = start();
  g.step(179);
  heat(g);
  g.step(1e9);
  a.equal(g.snapshot().heatElapsed, 1);
  a.equal(g.snapshot().phase, "results");
  a.equal(g.snapshot().averageQuality, 0);
  a.equal(g.profile().completedShifts, 1);
  g.step(999);
  g.advance();
  a.equal(g.profile().completedShifts, 1);
  a.equal(g.snapshot().served, 0);
  g.startShift();
  a.equal(g.snapshot().order.id, "ingatan-bening");
  a.equal(g.snapshot().unlockedCount, 4);
  g.step(180);
  g.startShift();
  a.equal(g.snapshot().order.id, "senyum-senja");
  g.step(180);
  g.startShift();
  a.equal(g.snapshot().order.id, "langkah-ringan");
  a.equal(g.snapshot().unlockedCount, 6);
});
test("profile sanitizes adversarial inputs and only saves completed shifts", () => {
  for (const profile of [
    null,
    "x".repeat(1025),
    "bad",
    '{"version":9,"completedShifts":4}',
    { version: 1, completedShifts: Infinity, totalCoins: -1, reputation: "99" },
  ]) {
    const g = start(profile);
    a.equal(g.snapshot().unlockedCount, 3);
    a.equal(g.profile().reputation, 50);
  }
  const g = start();
  bottle(g);
  g.advance();
  a.equal(g.profile().totalCoins, 0);
  g.step(180);
  a.equal(g.profile().totalCoins, 24);
  const p = g.profile();
  p.totalCoins = 900;
  a.equal(g.profile().totalCoins, 24);
});
test("invalid dt never mutates; immutable recipes; all six are playable", () => {
  a.ok(Object.isFrozen(E.RECIPES[0].ingredients));
  const g = start();
  for (const dt of [NaN, Infinity, -1, "1"]) {
    const s = g.snapshot();
    g.step(dt);
    a.deepEqual(g.snapshot(), s);
  }
  const all = start({ version: 1, completedShifts: 3 });
  const seen = new Set();
  for (let i = 0; i < 6; i++) {
    const r = all.snapshot().order;
    seen.add(r.id);
    heat(all, r.ingredients);
    const mid = (r.heat[0] + r.heat[1]) / 2;
    all.step(-10 * Math.log((116 - mid) / 96));
    all.advance();
    all.step(((r.stir[0] + r.stir[1]) / 2) * 0.012);
    all.advance();
    a.equal(all.snapshot().potion.quality, 100);
    all.advance();
  }
  a.equal(seen.size, 6);
  a.equal(all.snapshot().served, 6);
});
