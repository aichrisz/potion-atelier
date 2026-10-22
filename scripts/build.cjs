"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT, FILES, read } = require("./public.cjs");

const output = path.join(ROOT, "dist");

function ensureOutputDirectory(directory) {
  const relative = path.relative(ROOT, directory);
  if (
    path.isAbsolute(relative) ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`)
  ) {
    throw new Error("Output escapes project root");
  }

  let current = ROOT;
  const components = relative ? relative.split(path.sep) : [];
  // Walk before mkdir/write: recursive mkdir can silently follow an ancestor link.
  for (const component of ["", ...components]) {
    current = path.join(current, component);
    const stat = fs.lstatSync(current, { throwIfNoEntry: false });
    if (stat) {
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw new Error(`Unsafe output directory: ${current}`);
      }
    } else {
      fs.mkdirSync(current);
    }
  }
}

ensureOutputDirectory(output);

for (const name of FILES) {
  const target = path.join(output, name);
  ensureOutputDirectory(path.dirname(target));
  // lstat also detects dangling links, unlike existsSync followed by lstat.
  const stat = fs.lstatSync(target, { throwIfNoEntry: false });
  if (stat && (stat.isSymbolicLink() || !stat.isFile())) {
    throw new Error(`Unsafe output file: ${target}`);
  }
  fs.writeFileSync(target, read(name));
}

console.log("Built seven runtime files.");
