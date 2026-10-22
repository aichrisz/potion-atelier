/* Parent regression for a generated output ancestor redirect, not a real secret. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { FILES } = require("../scripts/public.cjs");

function buildFixture(run) {
  const base =
    process.env.TMPDIR ||
    path.join(__dirname, "..", "artifacts", "test-fixtures");
  fs.mkdirSync(base, { recursive: true });
  const root = fs.mkdtempSync(path.join(base, "potion-build-"));
  try {
    const project = path.join(root, "project");
    fs.mkdirSync(path.join(project, "scripts"), { recursive: true });
    for (const name of ["build.cjs", "public.cjs"]) {
      fs.copyFileSync(
        path.join(__dirname, "..", "scripts", name),
        path.join(project, "scripts", name),
      );
    }
    for (const name of FILES) {
      const file = path.join(project, name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, `PUBLIC_FIXTURE:${name}`);
    }
    return run(root, project);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("build works independently of cwd and emits only the seven public files", () =>
  buildFixture((root, project) => {
    const result = spawnSync(
      process.execPath,
      [path.join(project, "scripts/build.cjs")],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    for (const name of FILES) {
      assert.equal(
        fs.readFileSync(path.join(project, "dist", name), "utf8"),
        `PUBLIC_FIXTURE:${name}`,
      );
    }
    assert.equal(
      fs.existsSync(path.join(project, "dist", "package.json")),
      false,
    );
  }));

test("build refuses a symlinked output asset directory without overwriting its target", () =>
  buildFixture((root, project) => {
    const outside = path.join(root, "outside");
    fs.mkdirSync(outside);
    const sentinel = path.join(outside, "atelier.svg");
    fs.writeFileSync(sentinel, "DO_NOT_OVERWRITE_FIXTURE");
    fs.mkdirSync(path.join(project, "dist"));
    fs.symlinkSync(outside, path.join(project, "dist", "assets"), "dir");
    const result = spawnSync(
      process.execPath,
      [path.join(project, "scripts/build.cjs")],
      { cwd: root, encoding: "utf8" },
    );
    assert.notEqual(
      result.status,
      0,
      "A symlinked output ancestor must fail closed",
    );
    assert.equal(fs.readFileSync(sentinel, "utf8"), "DO_NOT_OVERWRITE_FIXTURE");
  }));
