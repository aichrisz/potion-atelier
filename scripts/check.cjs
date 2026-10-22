const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { ROOT, FILES, read } = require("./public.cjs");
for (const file of FILES) read(file);
for (const file of [
  "engine.js",
  "view.js",
  "app.js",
  "playwright.config.cjs",
  ...fs
    .readdirSync(path.join(ROOT, "scripts"))
    .filter((x) => x.endsWith(".cjs"))
    .map((x) => "scripts/" + x),
])
  execFileSync(process.execPath, ["--check", path.join(ROOT, file)]);
console.log("Runtime allowlist and JavaScript syntax checked.");
