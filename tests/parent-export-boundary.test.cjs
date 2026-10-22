/* Synthetic exporter regression: never point at real host secrets. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { FILES } = require("../scripts/public.cjs");

test("export refuses a dangling output symlink without creating its outside target", () => {
  const base =
    process.env.TMPDIR ||
    path.join(__dirname, "..", "artifacts", "test-fixtures");
  fs.mkdirSync(base, { recursive: true });
  const root = fs.mkdtempSync(path.join(base, "potion-export-"));
  try {
    const project = path.join(root, "project");
    fs.mkdirSync(path.join(project, "scripts"), { recursive: true });
    for (const name of ["export.cjs", "public.cjs"]) {
      fs.copyFileSync(
        path.join(__dirname, "..", "scripts", name),
        path.join(project, "scripts", name),
      );
    }
    for (const name of FILES) {
      fs.mkdirSync(path.dirname(path.join(project, name)), { recursive: true });
      fs.copyFileSync(
        path.join(__dirname, "..", name),
        path.join(project, name),
      );
    }
    const outside = path.join(root, "outside.html");
    fs.mkdirSync(path.join(project, "artifacts"));
    fs.symlinkSync(
      outside,
      path.join(project, "artifacts", "Potion-Atelier.html"),
    );
    const result = spawnSync(
      process.execPath,
      [path.join(project, "scripts", "export.cjs")],
      { cwd: root, encoding: "utf8", timeout: 10000 },
    );
    assert.notEqual(
      result.status,
      0,
      "Dangling output symlink must be rejected",
    );
    assert.equal(
      fs.existsSync(outside),
      false,
      "Exporter must not create an outside file",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
