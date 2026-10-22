const { test, expect } = require("@playwright/test");

for (const writable of [false, true]) {
  test(`results accurately report storage success=${writable}`, async ({
    page,
  }) => {
    await page.clock.install({ time: new Date("2026-10-22T12:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-22T12:00:01Z"));
    if (!writable) {
      // Reading works; only the later real write is denied, as with a full quota.
      await page.addInitScript(() => {
        Storage.prototype.setItem = function () {
          throw new DOMException("quota fixture", "QuotaExceededError");
        };
      });
    }
    await page.goto("/");
    await page.locator("#start").click();
    await page.clock.runFor(32);
    await page.clock.fastForward(181000);
    const dialog = page.locator("#results-dialog");
    await expect(dialog).toBeVisible();
    if (writable) {
      await expect(dialog).toContainText("Giliran selesai disimpan");
    } else {
      await expect(dialog).toContainText("kemajuan hanya untuk sesi ini");
      await expect(dialog).not.toContainText("Giliran selesai disimpan");
    }
    await expect(page.locator("#next")).toBeEnabled();
  });
}
