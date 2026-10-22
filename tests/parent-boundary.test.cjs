/* Parent regression: observed RED on a symlinked serving root before the fix.
 * Fixtures are synthetic and cannot disclose actual host secrets. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { read } = require("../scripts/public.cjs");

function fixture(run) {
  const parent =
    process.env.TMPDIR ||
    path.join(__dirname, "..", "artifacts", "test-fixtures");
  fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, "potion-boundary-"));
  try {
    const real = path.join(root, "real");
    fs.mkdirSync(real);
    fs.writeFileSync(path.join(real, "index.html"), "TEST_BOUNDARY_SENTINEL");
    return run(root, real);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("runtime reader denies private paths and symlinked runtime files", () =>
  fixture((root, real) => {
    assert.equal(read("index.html", real).toString(), "TEST_BOUNDARY_SENTINEL");
    for (const name of [
      "../package.json",
      ".git/config",
      ".env",
      "tests/engine.test.cjs",
    ]) {
      assert.throws(() => read(name, real));
    }
    fs.symlinkSync(path.join(real, "index.html"), path.join(real, "engine.js"));
    assert.throws(() => read("engine.js", real));
  }));

test("runtime reader rejects a symlinked serving root, including dist aliases", () =>
  fixture((root, real) => {
    const alias = path.join(root, "dist-alias");
    fs.symlinkSync(real, alias, "dir");
    assert.throws(
      () => read("index.html", alias),
      "A symlinked dist/root must not redirect serving outside its lexical boundary",
    );
  }));
