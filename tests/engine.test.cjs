const { test } = require("node:test");
const assert = require("node:assert/strict");
const Engine = require("../engine.js");
test("start shift establishes exact initial state", () => {
  const g = Engine.create({ seed: 1 });
  g.startShift();
  const s = g.snapshot();
  assert.equal(s.phase, "running");
  assert.equal(s.remaining, 180);
  assert.equal(s.stage, "ingredients");
  assert.equal(s.unlockedCount, 3);
});
