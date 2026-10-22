/* Parent edge/device/browser checks. These exercise public UI, never a live-game hook. */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const ROOT = path.resolve(__dirname, "../..");
const { chromium } = require(path.join(ROOT, "node_modules/@playwright/test"));
const URL = pathToFileURL(path.join(ROOT, "index.html")).href;
const OUT = path.join(ROOT, "artifacts", "parent");
const KEY = "potion-atelier.progress.v1";
async function ready(page) {
  await page.clock.install();
  await page.goto(URL);
  await page.clock.pauseAt(new Date(Date.now() + 750));
}
async function start(page, touch = false) {
  const b = page.getByRole("button", { name: "Buka kedai", exact: true });
  if (touch) await b.tap();
  else await b.click();
  await page.clock.runFor(32);
}
async function heat(page, touch = false) {
  for (const name of ["Lavender Bulan", "Embun Kristal", "Mint Perak"]) {
    const b = page.getByRole("button", { name, exact: true });
    if (touch) await b.tap();
    else await b.click();
  }
  if (touch) await page.locator("#primary").tap();
  else await page.locator("#primary").click();
  await page.locator("#fire").focus();
  await page.keyboard.press("End");
  await page.clock.runFor(1600);
}
async function bounds(page, selectors) {
  await page.locator("#primary").scrollIntoViewIfNeeded();
  const result = await page.evaluate(
    (selectors) => ({
      width: innerWidth,
      height: innerHeight,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      boxes: selectors.map((selector) => {
        const r = document.querySelector(selector).getBoundingClientRect();
        return {
          selector,
          x: r.x,
          y: r.y,
          w: r.width,
          h: r.height,
          inViewport:
            r.width > 0 &&
            r.height > 0 &&
            r.x >= -1 &&
            r.y >= -1 &&
            r.right <= innerWidth + 1 &&
            r.bottom <= innerHeight + 1,
        };
      }),
    }),
    selectors,
  );
  assert.equal(result.overflow, false, JSON.stringify(result));
  assert.ok(
    result.boxes.every((b) => b.inViewport),
    JSON.stringify(result),
  );
  return result;
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const records = [];
  function record(value) {
    records.push(value);
    fs.writeFileSync(
      path.join(OUT, "edge-report.json"),
      JSON.stringify(records, null, 2),
    );
  }
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      "/root/.hermes/tools/chromium-1208/chrome-linux/chrome",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    for (const [width, height] of [
      [320, 844],
      [390, 844],
      [768, 1024],
      [1024, 768],
      [1366, 768],
      [1440, 900],
    ]) {
      const touch = width === 390;
      const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: 2,
        isMobile: touch,
        hasTouch: touch,
        offline: true,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(7000);
      try {
        await ready(page);
        if (touch)
          await page.screenshot({
            path: path.join(OUT, "ready-390-default.png"),
            fullPage: true,
          });
        await start(page, touch);
        await heat(page, touch);
        const heating = await bounds(page, [
          "#recipe-name",
          "#heat-target",
          "#temperature",
          "#fire",
          "#primary",
        ]);
        if (touch || width === 1366)
          await page.screenshot({
            path: path.join(OUT, `heat-${width}-viewport.png`),
            fullPage: false,
          });
        if (touch) {
          const before = await page.locator("#temperature").textContent();
          await page.setViewportSize({ width: 320, height: 844 });
          assert.equal(
            await page.locator("#temperature").textContent(),
            before,
          );
          await page.setViewportSize({ width, height });
        }
        if (touch) await page.locator("#primary").tap();
        else await page.locator("#primary").click();
        await page.clock.runFor(544);
        const stirring = await bounds(page, [
          "#recipe-name",
          "#stir-target",
          "#stir-value",
          "#primary",
        ]);
        if (touch)
          await page.screenshot({
            path: path.join(OUT, "stir-390-viewport.png"),
            fullPage: false,
          });
        if (touch) await page.locator("#primary").tap();
        else await page.locator("#primary").click();
        assert.match(await page.locator("#quality").textContent(), /^100/);
        if (touch) await page.locator("#primary").tap();
        else await page.locator("#primary").click();
        assert.equal(await page.locator("#coins").textContent(), "24");
        await page.locator("#pause").click();
        const paused = await page.locator("#time").textContent();
        await page.clock.runFor(2000);
        assert.equal(await page.locator("#time").textContent(), paused);
        const dialog = await page.locator("#pause-dialog").boundingBox();
        assert.ok(
          dialog.x >= 0 &&
            dialog.y >= 0 &&
            dialog.x + dialog.width <= width + 1 &&
            dialog.y + dialog.height <= height + 1,
        );
        await page
          .getByRole("button", { name: "Lanjutkan", exact: true })
          .click();
        await page.clock.runFor(32);
        await page.clock.fastForward(181000);
        assert.equal(await page.locator("#phase").textContent(), "Selesai");
        const result = await page.locator("#results-dialog").boundingBox();
        assert.ok(
          result.x >= 0 &&
            result.y >= 0 &&
            result.x + result.width <= width + 1 &&
            result.y + result.height <= height + 1,
        );
        const saved = await page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key)),
          KEY,
        );
        assert.equal(saved.completedShifts, 1);
        assert.equal(saved.totalCoins, 24);
        await page.reload();
        await page.clock.runFor(32);
        assert.match(await page.locator("#unlock-count").textContent(), /^4/);
        record({
          case: `viewport-${width}`,
          touch,
          heating,
          stirring,
          storageRoundtrip: true,
          passed: true,
        });
      } catch (error) {
        await page
          .screenshot({
            path: path.join(OUT, `edge-FAIL-${width}.png`),
            fullPage: true,
          })
          .catch(() => {});
        throw error;
      } finally {
        await context.close();
      }
    }
    for (const variant of ["corrupt", "oversized", "denied", "adversarial"]) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        offline: true,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(7000);
      await page.addInitScript(
        ({ key, variant }) => {
          if (variant === "denied") {
            for (const method of ["getItem", "setItem"])
              Storage.prototype[method] = () => {
                throw new DOMException("Blocked for fixture", "SecurityError");
              };
            return;
          }
          const raw =
            variant === "corrupt"
              ? "bad-json"
              : variant === "oversized"
                ? "x".repeat(2048)
                : JSON.stringify({
                    version: 1,
                    completedShifts: 1e9,
                    reputation:
                      '<img src=x onerror="window.__potionInjected=1">',
                    totalCoins: -10,
                    bestQuality: null,
                  });
          localStorage.setItem(key, raw);
        },
        { key: KEY, variant },
      );
      try {
        await ready(page);
        assert.match(await page.locator("#unlock-count").textContent(), /^3/);
        assert.equal(await page.locator("#reputation").textContent(), "50");
        if (variant === "denied")
          assert.match(
            await page.locator("#storage-note").textContent(),
            /sesi ini/,
          );
        await start(page);
        await heat(page);
        await page.locator("#primary").click();
        await page.clock.runFor(544);
        await page.locator("#primary").click();
        await page.locator("#primary").click();
        assert.equal(await page.locator("#coins").textContent(), "24");
        assert.equal(
          await page.evaluate(() => window.__potionInjected),
          undefined,
        );
        await page.clock.fastForward(181000);
        assert.equal(await page.locator("#phase").textContent(), "Selesai");
        await page.locator("#next").click();
        assert.match(await page.locator("#unlock-count").textContent(), /^4/);
        record({
          case: `storage-${variant}`,
          fullBrew: true,
          nextShift: true,
          passed: true,
        });
      } finally {
        await context.close();
      }
    }
    {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        offline: true,
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      await page.goto(URL);
      assert.equal(await page.locator("#start").isDisabled(), true);
      assert.match(
        await page.locator("noscript").textContent(),
        /memerlukan JavaScript/,
      );
      record({ case: "no-javascript", passed: true });
      await context.close();
    }
    {
      const context = await browser.newContext({
        reducedMotion: "reduce",
        offline: true,
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      await ready(page);
      await start(page);
      await heat(page);
      await page.locator("#primary").click();
      const a = await page.locator("#stir-value").textContent();
      await page.clock.runFor(544);
      assert.notEqual(await page.locator("#stir-value").textContent(), a);
      await page.locator("#primary").click();
      await page.locator("#primary").click();
      assert.equal(await page.locator("#coins").textContent(), "24");
      record({ case: "reduced-motion-essential-play", passed: true });
      await context.close();
    }
    fs.writeFileSync(
      path.join(OUT, "edge-report.json"),
      JSON.stringify(records, null, 2),
    );
    // Aggregate from the persisted file, not a mentally counted scenario list.
    const saved = JSON.parse(
      fs.readFileSync(path.join(OUT, "edge-report.json"), "utf8"),
    );
    console.log(
      JSON.stringify(
        {
          cases: saved.length,
          passed: saved.filter((r) => r.passed).length,
          names: saved.map((r) => r.case),
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
