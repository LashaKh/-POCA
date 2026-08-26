import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import path from "node:path";

const reviewedProjects = new Set([
  "phone-390-ka",
  "tablet-768-en",
  "desktop-1440-de",
  "firefox-ru",
]);

test("Collector's Index two-pass visual and accessibility review", async ({
  page,
}, testInfo) => {
  test.skip(
    !reviewedProjects.has(testInfo.project.name),
    "The four selected projects cover 390, 768, 1440, and Russian long copy.",
  );

  const locale =
    testInfo.project.name === "phone-390-ka"
      ? "ka"
      : testInfo.project.name === "desktop-1440-de"
        ? "de"
        : testInfo.project.name === "firefox-ru"
          ? "ru"
          : "en";
  await page.goto(`/${locale}/collections/synthetic-collection`);
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(24);

  const layout = await page.evaluate(() => ({
    overflow:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    headingFont: getComputedStyle(document.querySelector("h1")!).fontFamily,
    bodyFont: getComputedStyle(document.body).fontFamily,
    visibleControlHeights: Array.from(
      document.querySelectorAll(
        "button:not(.visually-hidden), input:not([type='checkbox']), select",
      ),
    )
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => rect.height),
  }));

  expect(layout.overflow).toBe(0);
  expect(layout.headingFont).not.toBe(layout.bodyFont);
  expect(layout.visibleControlHeights.length).toBeGreaterThan(0);
  expect(Math.min(...layout.visibleControlHeights)).toBeGreaterThanOrEqual(44);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);

  await page.screenshot({
    path: path.resolve(
      process.cwd(),
      "docs/quality/screenshots",
      `us1-${testInfo.project.name}.png`,
    ),
    animations: "disabled",
    fullPage: false,
  });
});
