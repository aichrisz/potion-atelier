const { test, expect } = require("@playwright/test");
const path = require("node:path");
for (const [name, width, height] of [
  ["desktop", 1366, 768],
  ["mobile", 390, 844],
])
  test(`${name} actual screenshots and visible workbench`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.screenshot({
      path: `artifacts/${name}-ready.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Buka kedai" }).click();
    await page.screenshot({
      path: `artifacts/${name}-playing.png`,
      fullPage: true,
    });
    for (const id of ["recipe-name", "instrument", "primary"]) {
      const r = await page.locator("#" + id).boundingBox();
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.y + r.height).toBeLessThanOrEqual(height);
    }
  });
test("offline file has styled UI and no neighboring requests", async ({
  page,
  context,
}) => {
  await context.setOffline(true);
  const requests = [];
  page.on("request", (r) => {
    if (!r.isNavigationRequest() && !r.url().startsWith("data:"))
      requests.push(r.url());
  });
  await page.goto("file://" + path.resolve("artifacts/Potion-Atelier.html"));
  await expect(page.getByRole("button", { name: "Buka kedai" })).toBeEnabled();
  expect(
    await page
      .locator("body")
      .evaluate((e) => getComputedStyle(e).backgroundColor),
  ).toBe("rgb(48, 38, 31)");
  expect(requests).toEqual([]);
});
