const fs = require("node:fs");
const path = require("node:path");
const { ROOT, read } = require("./public.cjs");
let html = read("index.html").toString();
let styles = 0;
html = html.replace(
  /<link\b[^>]*href=["']styles\.css["'][^>]*\/?\s*>/gi,
  () => {
    styles++;
    return "<style>" + read("styles.css") + "</style>";
  },
);
if (styles !== 1) throw Error("Expected exactly one stylesheet");
for (const name of ["engine.js", "view.js", "app.js"]) {
  const pattern = new RegExp(
    "<script\\s+src=[\"\\']" +
      name.replace(".", "\\.") +
      "[\"\\']\\s*>\\s*</script>",
    "g",
  );
  let count = 0;
  html = html.replace(pattern, () => {
    count++;
    return (
      "<script>" +
      read(name)
        .toString()
        .replace(/<\/script/gi, "<\\/script") +
      "</script>"
    );
  });
  if (count !== 1) throw Error("Missing script " + name);
}
for (const name of ["assets/atelier.svg", "assets/mark.svg"])
  html = html
    .split(name)
    .join("data:image/svg+xml;base64," + read(name).toString("base64"));
if (
  /(?:src|href)=["'](?!data:|#)[^"']+/i.test(html) ||
  /@import|url\(/i.test(read("styles.css").toString())
)
  throw Error("Unembedded runtime resource");
const out = path.join(ROOT, "artifacts");
function assertSafeOutput(target, directory = false) {
  let stat;
  try {
    // lstat also sees dangling links; existsSync would silently miss them.
    stat = fs.lstatSync(target);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  if (
    stat.isSymbolicLink() ||
    (directory ? !stat.isDirectory() : !stat.isFile())
  )
    throw Error("Unsafe output");
}
assertSafeOutput(out, true);
fs.mkdirSync(out, { recursive: true });
const file = path.join(out, "Potion-Atelier.html");
assertSafeOutput(file);
fs.writeFileSync(file, html);
console.log("Exported self-contained Potion-Atelier.html");
