const http = require("node:http");
const path = require("node:path");
const { ROOT, read } = require("./public.cjs");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
};
http
  .createServer((req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      const name = decodeURIComponent(url.pathname).slice(1) || "index.html";
      const built = name.startsWith("dist/");
      const file = built ? name.slice(5) : name;
      const body = read(file, built ? path.join(ROOT, "dist") : ROOT);
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)],
        "Cache-Control": "no-store",
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(4186, "127.0.0.1", () =>
    console.log("Potion Atelier: http://127.0.0.1:4186"),
  );
