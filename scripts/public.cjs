const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const FILES = Object.freeze([
  "index.html",
  "styles.css",
  "engine.js",
  "view.js",
  "app.js",
  "assets/atelier.svg",
  "assets/mark.svg",
]);
function read(name, base = ROOT) {
  if (!FILES.includes(name)) throw new Error("Not public");
  if (fs.lstatSync(base).isSymbolicLink())
    throw new Error("Symlink root denied");
  const target = path.join(base, name);
  let current = base;
  for (const part of name.split("/")) {
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink())
      throw new Error("Symlink denied");
  }
  if (!fs.realpathSync(target).startsWith(fs.realpathSync(base) + path.sep))
    throw new Error("Escape denied");
  return fs.readFileSync(target);
}
module.exports = { ROOT, FILES, read };
