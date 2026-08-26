import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("empty cart remains usable at each configured viewport and locale", async ({
  page,
}, testInfo) => {
  const locale = testInfo.project.name.includes("ka")
    ? "ka"
    : testInfo.project.name.includes("de")
      ? "de"
      : testInfo.project.name.includes("ru")
        ? "ru"
        : "en";
  await page.goto(`/${locale}/cart`);
  await expect(page.locator("main h1")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});
