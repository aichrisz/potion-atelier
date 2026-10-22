/* Independent browser play-through: real native inputs only, no live-state hook. */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const ROOT = path.resolve(__dirname, "../..");
const { chromium } = require(path.join(ROOT, "node_modules/@playwright/test"));
const mode = process.argv[2] || "source";
const target = pathToFileURL(
  path.join(
    ROOT,
    mode === "offline"
      ? "artifacts/Potion-Atelier.html"
      : mode === "dist"
        ? "dist/index.html"
        : "index.html",
  ),
).href;
const OUT = path.join(ROOT, "artifacts", "parent");
const KEY = "potion-atelier.progress.v1";
const names = {
  "moon-lavender": "Lavender Bulan",
  dew: "Embun Kristal",
  "ember-cap": "Jamur Lentera",
  rose: "Kelopak Senja",
  "star-anise": "Anis Bintang",
  mint: "Mint Perak",
};
const recipes = [
  {
    name: "Embun Tidur",
    ingredients: ["moon-lavender", "dew", "mint"],
    heat: [38, 48],
    stir: [35, 55],
    base: 24,
  },
  {
    name: "Kelopak Pulih",
    ingredients: ["rose", "dew", "mint"],
    heat: [60, 70],
    stir: [50, 70],
    base: 28,
  },
  {
    name: "Pijar Berani",
    ingredients: ["ember-cap", "rose", "star-anise"],
    heat: [72, 82],
    stir: [65, 82],
    base: 32,
  },
  {
    name: "Ingatan Bening",
    ingredients: ["moon-lavender", "dew", "star-anise"],
    heat: [45, 55],
    stir: [25, 45],
    base: 30,
  },
  {
    name: "Senyum Senja",
    ingredients: ["rose", "star-anise", "mint"],
    heat: [55, 65],
    stir: [40, 58],
    base: 34,
  },
  {
    name: "Langkah Ringan",
    ingredients: ["moon-lavender", "ember-cap", "mint"],
    heat: [30, 40],
    stir: [30, 50],
    base: 36,
  },
];
const profile = {
  version: 1,
  completedShifts: 3,
  totalCoins: 0,
  bestShiftCoins: 0,
  bestQuality: 0,
  reputation: 50,
};
const number = (text) =>
  Number(
    String(text)
      .replace(",", ".")
      .match(/-?\d+(?:\.\d+)?/)?.[0],
  );
async function activate(locator, keyboard) {
  if (keyboard) {
    await locator.focus();
    await locator.press("Enter");
  } else await locator.click();
}
async function geometry(page, selectors) {
  await page.locator("#primary").scrollIntoViewIfNeeded();
  const info = await page.evaluate((selectors) => {
    const vh = innerHeight,
      vw = innerWidth;
    const boxes = selectors.map((selector) => {
      const e = document.querySelector(selector);
      if (!e) return { selector, missing: true };
      const r = e.getBoundingClientRect();
      return {
        selector,
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        visible:
          r.width > 0 &&
          r.height > 0 &&
          r.x >= -1 &&
          r.y >= -1 &&
          r.right <= vw + 1 &&
          r.bottom <= vh + 1,
      };
    });
    return {
      vw,
      vh,
      overflow: document.documentElement.scrollWidth > vw + 1,
      boxes,
    };
  }, selectors);
  assert.equal(
    info.overflow,
    false,
    `Horizontal overflow: ${JSON.stringify(info)}`,
  );
  assert.ok(
    info.boxes.every((box) => box.visible),
    `Active instrument and action need one usable viewport: ${JSON.stringify(info)}`,
  );
  return info;
}
async function brew(
  page,
  recipe,
  { keyboard = false, wrong = false, shots = false } = {},
) {
  const ids = [...recipe.ingredients];
  if (wrong)
    ids[2] = Object.keys(names).find((id) => !recipe.ingredients.includes(id));
  for (const id of ids)
    await activate(
      page.getByRole("button", { name: names[id], exact: true }),
      keyboard,
    );
  await activate(page.locator("#primary"), keyboard);
  await page.locator("#fire").focus();
  await page.keyboard.press("End");
  assert.equal(await page.locator("#fire").inputValue(), "100");
  await page.clock.runFor(1100);
  const mid = (recipe.heat[0] + recipe.heat[1]) / 2;
  for (
    let count = 0;
    count < 60 &&
    number(await page.locator("#temperature").textContent()) < mid;
    count++
  )
    await page.clock.runFor(100);
  const temp = number(await page.locator("#temperature").textContent());
  assert.ok(
    temp >= recipe.heat[0] && temp <= recipe.heat[1],
    `Observed heat ${temp} must reach ${recipe.heat}`,
  );
  const bounds = await geometry(page, ["#temperature", "#fire", "#primary"]);
  if (shots)
    await page.screenshot({
      path: path.join(OUT, `${mode}-heat-${page.viewportSize().width}.png`),
      fullPage: true,
    });
  await activate(page.locator("#primary"), keyboard);
  await page.clock.runFor(((recipe.stir[0] + recipe.stir[1]) / 2) * 12);
  await activate(page.locator("#primary"), keyboard);
  const quality = number(await page.locator("#quality").textContent());
  assert.equal(quality, wrong ? 40 : 100);
  if (shots)
    await page.screenshot({
      path: path.join(OUT, `${mode}-bottle-${page.viewportSize().width}.png`),
      fullPage: true,
    });
  const before = number(await page.locator("#coins").textContent());
  await activate(page.locator("#primary"), keyboard);
  const after = number(await page.locator("#coins").textContent());
  assert.equal(after - before, wrong ? 0 : recipe.base);
  // A second activation acts on an empty new mixture and cannot credit another bottle.
  await activate(page.locator("#primary"), keyboard);
  assert.equal(number(await page.locator("#coins").textContent()), after);
  return {
    name: recipe.name,
    quality,
    coins: after - before,
    temp,
    keyboard,
    wrong,
    bounds,
  };
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      "/root/.hermes/tools/chromium-1208/chrome-linux/chrome",
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    offline: true,
  });
  const page = await context.newPage();
  const requests = [],
    errors = [];
  page.on("request", (r) => requests.push(r.url()));
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfailed", (r) =>
    errors.push(`${r.url()}: ${r.failure()?.errorText}`),
  );
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: KEY, value: profile },
  );
  const installRafAudit = () => {
    const pending = new Set();
    const audit = { pending: 0, max: 0, ticks: 0 };
    window.__parentRafAudit = audit;
    const request = window.requestAnimationFrame.bind(window),
      cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      let id;
      id = request((timestamp) => {
        pending.delete(id);
        audit.pending = pending.size;
        audit.ticks++;
        callback(timestamp);
      });
      pending.add(id);
      audit.pending = pending.size;
      audit.max = Math.max(audit.max, audit.pending);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      pending.delete(id);
      audit.pending = pending.size;
      return cancel(id);
    };
  };
  try {
    await page.clock.install();
    await page.goto(target);
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    // Install AFTER Playwright's clock so its initialization cannot overwrite the audit.
    await page.evaluate(installRafAudit);
    await page.clock.runFor(100);
    assert.match(await page.locator("#phase").textContent(), /Siap/);
    assert.equal(
      await page.evaluate(() => window.__parentRafAudit.pending),
      0,
      "Ready must not maintain a JS render loop",
    );
    await page.screenshot({
      path: path.join(OUT, `${mode}-ready-1440.png`),
      fullPage: true,
    });
    const style = await page.evaluate(() => ({
      body: getComputedStyle(document.body).backgroundColor,
      button: getComputedStyle(document.querySelector("#primary")).minHeight,
      display: getComputedStyle(document.querySelector("main")).display,
    }));
    assert.notEqual(
      style.body,
      "rgba(0, 0, 0, 0)",
      "Real embedded CSS must apply, not bare HTML",
    );
    await page.getByRole("button", { name: "Buka kedai", exact: true }).click();
    await page.clock.runFor(64);
    await page.evaluate(() => {
      window.__parentRafAudit.max = window.__parentRafAudit.pending;
    });
    const brewed = [];
    for (let index = 0; index < 6; index++) {
      const current = (await page.locator("#recipe-name").textContent()).trim();
      const recipe = recipes.find((r) => r.name === current);
      assert.ok(recipe, `Real known recipe expected: ${current}`);
      brewed.push(
        await brew(page, recipe, {
          keyboard: index % 2 === 0,
          shots: index === 0,
        }),
      );
    }
    assert.equal(new Set(brewed.map((r) => r.name)).size, 6);
    const expected = recipes.reduce((sum, r) => sum + r.base, 0);
    assert.equal(number(await page.locator("#coins").textContent()), expected);
    // Native Escape from the ingredient control, no injection into live game state.
    await page
      .getByRole("button", { name: "Lavender Bulan", exact: true })
      .focus();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#phase").textContent(), "Dijeda");
    await page.clock.runFor(64);
    assert.equal(
      await page.evaluate(() => window.__parentRafAudit.pending),
      0,
      "Pause cancels the active loop",
    );
    const paused = await page.locator("#time").textContent();
    await page.clock.runFor(3000);
    assert.equal(await page.locator("#time").textContent(), paused);
    await page.getByRole("button", { name: "Lanjutkan", exact: true }).click();
    await page.clock.runFor(64);
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    assert.equal(
      await page.locator("#phase").textContent(),
      "Dijeda",
      "Browser blur handler must pause",
    );
    await page.getByRole("button", { name: "Lanjutkan", exact: true }).click();
    await page.clock.runFor(64);
    const current = (await page.locator("#recipe-name").textContent()).trim();
    const wrongRecipe = recipes.find((r) => r.name === current);
    const bad = await brew(page, wrongRecipe, { wrong: true });
    assert.equal(bad.coins, 0);
    // After real brewing frames, a large observed delta tests completion without
    // executing eleven thousand redundant layout frames inside the harness.
    await page.clock.fastForward(181000);
    assert.equal(await page.locator("#phase").textContent(), "Selesai");
    assert.equal(
      await page.evaluate(() => window.__parentRafAudit.pending),
      0,
      "Results stops the active loop",
    );
    const saved = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)),
      KEY,
    );
    assert.equal(saved.completedShifts, 4);
    assert.equal(saved.totalCoins, expected);
    assert.equal(saved.bestShiftCoins, expected);
    assert.equal(saved.bestQuality, 100);
    await page.screenshot({
      path: path.join(OUT, `${mode}-results-1440.png`),
      fullPage: true,
    });
    const savedOnce = JSON.stringify(saved);
    await page.clock.runFor(5000);
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), KEY),
      savedOnce,
    );
    const raf = await page.evaluate(() => window.__parentRafAudit);
    assert.ok(
      raf.ticks > 0,
      "The independent loop instrumentation must observe actual callbacks, not pass vacuously",
    );
    assert.ok(
      raf.max <= 1,
      `Only one continuing animation chain: ${JSON.stringify(raf)}`,
    );
    await page
      .getByRole("button", { name: "Giliran berikutnya", exact: true })
      .click();
    await page.clock.runFor(64);
    assert.equal(number(await page.locator("#coins").textContent()), 0);
    const neighbors = requests.filter(
      (url) => url !== target && !url.startsWith("data:"),
    );
    if (mode === "offline")
      assert.deepEqual(
        neighbors,
        [],
        "Self-contained export must not request any neighboring or external resource",
      );
    assert.deepEqual(errors, []);
    const report = {
      mode,
      target,
      style,
      brewed,
      bad,
      saved,
      raf,
      requestCount: requests.length,
      neighborRequests: neighbors,
      errors,
    };
    fs.writeFileSync(
      path.join(OUT, `${mode}-browser-report.json`),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    await page
      .screenshot({ path: path.join(OUT, `${mode}-FAIL.png`), fullPage: true })
      .catch(() => {});
    throw error;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
