const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 30000,
  reporter: [
    ["list"],
    ["json", { outputFile: "artifacts/playwright-results.json" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:4186",
    headless: true,
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_PATH ||
        "/root/.hermes/tools/chromium-1208/chrome-linux/chrome",
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "node scripts/server.cjs",
    url: "http://127.0.0.1:4186/engine.js",
    reuseExistingServer: false,
  },
});
