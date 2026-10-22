/* Parent coverage expansion: the same real UI is audited in every meaningful phase. */
const { test, expect } = require("@playwright/test");
const AXE = require.resolve("axe-core/axe.min.js");

async function scan(page, state, audits) {
  // axe's internal timers need a live clock. Freezing it makes an audit hang.
  await page.clock.resume();
  const violations = await page.evaluate(async () => {
    const result = await axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"],
      },
    });
    return result.violations.map((item) => ({
      id: item.id,
      impact: item.impact,
      help: item.help,
      nodes: item.nodes.map((node) => ({
        target: node.target,
        summary: node.failureSummary,
      })),
    }));
  });
  const future = await page.evaluate(() => Date.now() + 100);
  await page.clock.pauseAt(new Date(future));
  audits.push({ state, violations });
  expect(violations, `axe: ${state}`).toEqual([]);
}

test("axe WCAG and best-practice: ready, heating, stirring, bottled, paused and results", async ({
  page,
}, testInfo) => {
  await page.clock.install({ time: new Date("2026-10-22T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-22T12:00:01Z"));
  await page.goto("/");
  await page.addScriptTag({ path: AXE });
  const audits = [];
  try {
    await scan(page, "ready", audits);
    await page.locator("#start").click();
    await page.clock.runFor(32);
    for (const name of ["Lavender Bulan", "Embun Kristal", "Mint Perak"]) {
      await page.getByRole("button", { name, exact: true }).click();
    }
    await page.locator("#primary").click();
    await page.clock.runFor(1200);
    await scan(page, "heating", audits);
    await page.locator("#primary").click();
    await page.clock.runFor(544);
    await scan(page, "stirring", audits);
    await page.locator("#primary").click();
    await scan(page, "bottled", audits);
    await page.locator("#pause").click();
    await scan(page, "paused", audits);
    await page.locator("#resume").click();
    await page.clock.runFor(32);
    await page.clock.fastForward(181000);
    await expect(page.locator("#phase")).toHaveText("Selesai");
    await scan(page, "results", audits);
  } finally {
    await testInfo.attach("axe-phase-audits", {
      body: JSON.stringify(audits, null, 2),
      contentType: "application/json",
    });
  }
});

test("native keyboard brewing, visibility pause and explicit resume preserve the real mixture", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-22T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-22T12:00:01Z"));
  await page.goto("/");
  await page.locator("#start").focus();
  await page.keyboard.press("Enter");
  await page.clock.runFor(32);
  for (const name of ["Lavender Bulan", "Embun Kristal", "Mint Perak"]) {
    await page.getByRole("button", { name, exact: true }).focus();
    await page.keyboard.press("Space");
  }
  await page.locator("#primary").focus();
  await page.keyboard.press("Enter");
  await page.locator("#fire").focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("End");
  await expect(page.locator("#fire")).toHaveValue("100");
  await page.clock.runFor(1600);
  const before = await page.locator("#temperature").textContent();
  // Model browser visibility through its public event/property; never mutate game state.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("#phase")).toHaveText("Dijeda");
  await page.clock.fastForward(20000);
  await expect(page.locator("#temperature")).toHaveText(before);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("#phase")).toHaveText("Dijeda");
  await page.locator("#resume").focus();
  await page.keyboard.press("Enter");
  await page.clock.runFor(32);
  await page.locator("#primary").focus();
  await page.keyboard.press("Enter");
  await page.clock.runFor(544);
  await page.keyboard.press("Space");
  await expect(page.locator("#quality")).toContainText("100");
  await page.keyboard.press("Enter");
  await expect(page.locator("#coins")).toHaveText("24");
  await expect(page.locator("#recipe-name")).toHaveText("Kelopak Pulih");
});
