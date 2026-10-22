const { test, expect } = require("@playwright/test");
async function begin(page, url = "/") {
  await page.clock.install({ time: new Date("2026-10-22T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-22T12:00:01Z"));
  await page.goto(url);
  await page.getByRole("button", { name: "Buka kedai" }).click();
  await page.clock.runFor(32);
}
async function brew(page) {
  for (const name of ["Lavender Bulan", "Embun Kristal", "Mint Perak"])
    await page.getByRole("button", { name, exact: true }).click();
  await page.locator("#primary").click();
  await page.locator("#fire").focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("End");
  await page.keyboard.press("Home");
  for (let i = 0; i < 60; i++) await page.keyboard.press("ArrowRight");
  await page.clock.runFor(2800);
  await expect(page.locator("#temperature")).toContainText("43");
  await page.locator("#primary").click();
  await page.clock.runFor(544);
  await page.locator("#primary").click();
  await expect(page.locator("#quality")).toContainText("100");
}
test("real ingredients, native fire, live stir, bottle and once-only serving", async ({
  page,
}) => {
  await begin(page);
  await expect(page.locator("#phase")).toHaveText("Berlangsung");
  await brew(page);
  await page.locator("#primary").click();
  await expect(page.locator("#coins")).toHaveText("24");
  await expect(page.locator("#recipe-name")).toHaveText("Kelopak Pulih");
  await page.locator("#primary").click();
  await expect(page.locator("#coins")).toHaveText("24");
});
test("native control pause freezes clock; explicit resume; completion unlock saves once", async ({
  page,
}) => {
  await begin(page);
  await page.locator("#primary").focus();
  await page.keyboard.press("p");
  await expect(page.locator("#phase")).toHaveText("Dijeda");
  const time = await page.locator("#time").textContent();
  await page.clock.runFor(5000);
  await expect(page.locator("#time")).toHaveText(time);
  await page.getByRole("button", { name: "Lanjutkan" }).click();
  await page.clock.runFor(32);
  await page.clock.fastForward(180100);
  await expect(page.locator("#phase")).toHaveText("Selesai");
  await expect(page.locator("#result-summary")).toContainText("0");
  await page.getByRole("button", { name: "Giliran berikutnya" }).click();
  await expect(page.locator("#recipe-name")).toHaveText("Ingatan Bening");
  const p = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("potion-atelier.progress.v1")),
  );
  expect(p.completedShifts).toBe(1);
});
module.exports = { begin, brew };
