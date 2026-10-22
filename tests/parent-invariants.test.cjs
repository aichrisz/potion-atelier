/* Parent-owned, independent oracle. No renderer or production scoring helper is used. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { resolve } = require("node:path");
const ROOT = process.env.POTION_ROOT || resolve(__dirname, "..");
const exported = require(resolve(ROOT, "engine.js"));
const Engine = exported.Engine || exported;
const recipes = [
  {
    id: "embun-tidur",
    ingredients: ["moon-lavender", "dew", "mint"],
    heat: [38, 48],
    stir: [35, 55],
    base: 24,
  },
  {
    id: "kelopak-pulih",
    ingredients: ["rose", "dew", "mint"],
    heat: [60, 70],
    stir: [50, 70],
    base: 28,
  },
  {
    id: "pijar-berani",
    ingredients: ["ember-cap", "rose", "star-anise"],
    heat: [72, 82],
    stir: [65, 82],
    base: 32,
  },
  {
    id: "ingatan-bening",
    ingredients: ["moon-lavender", "dew", "star-anise"],
    heat: [45, 55],
    stir: [25, 45],
    base: 30,
  },
  {
    id: "senyum-senja",
    ingredients: ["rose", "star-anise", "mint"],
    heat: [55, 65],
    stir: [40, 58],
    base: 34,
  },
  {
    id: "langkah-ringan",
    ingredients: ["moon-lavender", "ember-cap", "mint"],
    heat: [30, 40],
    stir: [30, 50],
    base: 36,
  },
];
const allIngredients = [
  "moon-lavender",
  "dew",
  "ember-cap",
  "rose",
  "star-anise",
  "mint",
];
const blank = (overrides) => ({
  version: 1,
  completedShifts: 0,
  totalCoins: 0,
  bestShiftCoins: 0,
  bestQuality: 0,
  reputation: 50,
  ...overrides,
});
function getRecipe(snapshot) {
  const id =
    snapshot.order?.id ||
    snapshot.order?.recipeId ||
    snapshot.order?.recipe?.id ||
    snapshot.order?.recipe;
  const recipe = recipes.find((item) => item.id === id);
  assert.ok(
    recipe,
    `Known order recipe ID required, received ${JSON.stringify(snapshot.order)}`,
  );
  return recipe;
}
function distance(value, band) {
  return Math.max(band[0] - value, value - band[1], 0);
}
function points(recipe, ids, temperature, position) {
  const correct =
    ids.length === 3 && recipe.ingredients.every((id) => ids.includes(id));
  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (correct ? 60 : 0) +
          Math.max(0, 20 - distance(temperature, recipe.heat)) +
          Math.max(0, 20 - 0.8 * distance(position, recipe.stir)),
      ),
    ),
  );
}
function qualityOf(snapshot) {
  assert.ok(
    snapshot.potion,
    "Bottled stage must expose the actual pending potion",
  );
  return snapshot.potion.quality;
}
function profileOf(game) {
  return game.profile();
}
function prepare(game, ids) {
  for (const id of ids) game.toggleIngredient(id);
  game.advance();
  assert.equal(game.snapshot().stage, "heating");
  game.setHeat(100);
}
function brew(game, { wrong = false, heatOffset = 0, stirOffset = 0 } = {}) {
  const recipe = getRecipe(game.snapshot());
  let ids = [...recipe.ingredients];
  if (wrong)
    ids[2] = allIngredients.find((id) => !recipe.ingredients.includes(id));
  prepare(game, ids);
  const target = (recipe.heat[0] + recipe.heat[1]) / 2 + heatOffset;
  // Oracle derives analytical heat time for maximum fire from the documented model.
  const heatTime = Math.max(
    1.00001,
    -10 * Math.log((target - 180) / (20 - 180)),
  );
  game.step(heatTime);
  const temperature = game.snapshot().temperature;
  game.advance();
  assert.equal(game.snapshot().stage, "stirring");
  const targetStir = Math.max(
    0,
    Math.min(100, (recipe.stir[0] + recipe.stir[1]) / 2 + stirOffset),
  );
  game.step(Math.max(0.25001, (targetStir / 100) * 1.2));
  const position = game.snapshot().stirPosition;
  const before = game.snapshot();
  const expectedQuality = points(recipe, ids, temperature, position);
  const expectedReward =
    expectedQuality < 50
      ? 0
      : Math.round(recipe.base * (expectedQuality / 100) ** 2);
  const reputationDelta =
    expectedQuality >= 85 ? 3 : expectedQuality >= 50 ? 1 : -4;
  game.advance();
  const bottle = game.snapshot();
  assert.equal(bottle.stage, "bottled");
  assert.equal(
    qualityOf(bottle),
    expectedQuality,
    "Quality must match an independent oracle",
  );
  assert.equal(
    bottle.coins,
    before.coins,
    "Bottling must not credit a payment",
  );
  game.advance();
  const after = game.snapshot();
  assert.equal(after.stage, "ingredients");
  assert.equal(
    after.coins - before.coins,
    expectedReward,
    "Only serving pays the documented reward",
  );
  assert.equal(after.served - before.served, 1);
  assert.equal(after.good - before.good, expectedQuality >= 50 ? 1 : 0);
  assert.equal(
    after.reputation,
    Math.max(0, Math.min(100, before.reputation + reputationDelta)),
  );
  const once = JSON.stringify(after);
  game.advance();
  assert.equal(
    JSON.stringify(game.snapshot()),
    once,
    "A duplicate activation must not serve or mutate domain state",
  );
  return {
    recipe: recipe.id,
    quality: expectedQuality,
    reward: expectedReward,
  };
}
test("parent: all six real recipes and full-price perfect quality are reachable", () => {
  const game = Engine.create({
    seed: 53,
    profile: blank({ completedShifts: 3 }),
  });
  game.startShift();
  const reached = new Set();
  for (let index = 0; index < 18 && reached.size < 6; index++) {
    const result = brew(game);
    assert.equal(result.quality, 100);
    assert.equal(
      result.reward,
      recipes.find((item) => item.id === result.recipe).base,
    );
    reached.add(result.recipe);
  }
  assert.equal(
    reached.size,
    6,
    "Actual customer sequence must not starve unlocked content",
  );
});
test("parent: sixty reproducible mixed-action runs preserve scoring/resource/state invariants", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const game = Engine.create({
      seed,
      profile: blank({ completedShifts: 3, reputation: seed % 2 ? 0 : 100 }),
    });
    game.startShift();
    for (let order = 0; order < 8; order++) {
      // The parent seed varies real input sequences; it does not assume randomized game orders.
      const wrong = (order + seed) % 3 === 0;
      const result = brew(game, {
        wrong,
        heatOffset: (((seed + order) % 5) - 2) * 8,
        stirOffset: ((seed * 7 + order * 11) % 70) - 35,
      });
      if (wrong) {
        assert.ok(result.quality <= 40);
        assert.equal(result.reward, 0);
      }
      const snapshot = game.snapshot();
      for (const key of [
        "coins",
        "served",
        "good",
        "qualityTotal",
        "bestQuality",
        "reputation",
      ]) {
        assert.ok(Number.isFinite(snapshot[key]), `${key} must be finite`);
        assert.ok(Number.isInteger(snapshot[key]), `${key} must be an integer`);
        assert.ok(snapshot[key] >= 0, `${key} must not become negative`);
      }
      assert.ok(snapshot.reputation <= 100 && snapshot.bestQuality <= 100);
      assert.ok(snapshot.good <= snapshot.served);
      assert.ok(snapshot.remaining >= 0 && snapshot.remaining <= 180);
      assert.ok(snapshot.temperature >= 20 && snapshot.temperature <= 100);
      assert.ok(snapshot.stirPosition >= 0 && snapshot.stirPosition <= 100);
      game.pause();
      const paused = JSON.stringify(game.snapshot());
      game.step(999999);
      game.advance();
      game.toggleIngredient("dew");
      game.setHeat(100);
      assert.equal(
        JSON.stringify(game.snapshot()),
        paused,
        "Pause rejects input and consumes no elapsed time",
      );
      game.resume();
    }
    game.step(1e9);
    assert.equal(game.snapshot().phase, "results");
    const complete = JSON.stringify(profileOf(game));
    game.step(1e9);
    game.advance();
    assert.equal(
      JSON.stringify(profileOf(game)),
      complete,
      "Finish/profile award must occur once",
    );
    assert.equal(profileOf(game).completedShifts, 4);
  }
});
test("parent: empty shifts unlock one recipe each, cap six, and keep averages finite", () => {
  const game = Engine.create({ seed: 5 });
  for (let count = 0; count < 5; count++) {
    game.startShift();
    assert.equal(game.snapshot().unlockedCount, Math.min(6, 3 + count));
    assert.equal(game.snapshot().coins, 0);
    assert.equal(game.snapshot().served, 0);
    game.step(200);
    assert.equal(game.snapshot().phase, "results");
    assert.equal(game.snapshot().remaining, 0);
    assert.equal(game.snapshot().averageQuality, 0);
    assert.equal(profileOf(game).completedShifts, count + 1);
  }
});
test("parent: invalid deltas cannot poison time and profile copies cannot mutate the engine", () => {
  const game = Engine.create({ seed: 8 });
  game.startShift();
  const before = JSON.stringify(game.snapshot());
  for (const bad of [
    NaN,
    Infinity,
    -Infinity,
    -1,
    undefined,
    null,
    "1",
    {},
    [],
  ]) {
    game.step(bad);
    assert.equal(
      JSON.stringify(game.snapshot()),
      before,
      `Invalid dt ${String(bad)} must be rejected`,
    );
  }
  const profile = profileOf(game);
  profile.completedShifts = 100000;
  profile.reputation = -99;
  assert.equal(profileOf(game).completedShifts, 0);
  assert.equal(profileOf(game).reputation, 50);
  const snapshot = game.snapshot();
  snapshot.order.id = "tampered";
  snapshot.ingredients.push("tampered");
  assert.equal(JSON.stringify(game.snapshot()), before);
});
