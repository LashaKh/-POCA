import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import type { AppLocale } from "@/i18n/routing";

const localeByProject: Record<string, AppLocale> = {
  "phone-390-ka": "ka",
  "tablet-768-en": "en",
  "desktop-1440-de": "de",
  "firefox-ru": "ru",
  "webkit-en": "en",
};

test("Journal keeps the Collector's Index composition across the supported browser matrix", async ({
  page,
}, testInfo) => {
  const locale = localeByProject[testInfo.project.name];
  await page.goto(`/${locale}/journal`);
  await expect(page.locator(".journal-hero h1")).toBeVisible();
  await expect(page.locator(".journal-empty")).toBeVisible();
  await expect(page.locator(".journal-empty-link")).toBeVisible();
  await expect(page.locator(".footer-wordmark")).toBeVisible();

  const composition = await page.evaluate(() => {
    const siteHeader = document.querySelector<HTMLElement>(".site-header");
    const title = document.querySelector<HTMLElement>(".journal-hero h1");
    const titleRange = document.createRange();
    if (title) titleRange.selectNodeContents(title);
    return {
      headerHeight: siteHeader?.getBoundingClientRect().height ?? 0,
      titleLineCount: title
        ? new Set(
            Array.from(titleRange.getClientRects()).map((rect) =>
              Math.round(rect.top),
            ),
          ).size
        : 0,
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
  const maximumHeaderHeight = testInfo.project.name.includes("desktop")
    ? 170
    : testInfo.project.name === "phone-390-ka"
      ? 340
      : testInfo.project.name.startsWith("tablet")
        ? 320
        : 170;
  expect(composition.headerHeight).toBeLessThanOrEqual(maximumHeaderHeight);
  expect(composition.titleLineCount).toBe(1);
  expect(composition.overflow).toBeLessThanOrEqual(1);

  await page.locator("details").evaluateAll((details) => {
    for (const detail of details) (detail as HTMLDetailsElement).open = true;
  });
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);

  const controls = await page
    .locator(
      ".site-header a, .site-header button:not(.visually-hidden), .site-header input, .site-header select, .journal-empty-link, .newsletter-panel button, .newsletter-panel input, .newsletter-panel summary",
    )
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.height < 44;
        })
        .map((element) => ({
          height: Math.round(element.getBoundingClientRect().height),
          text: element.textContent?.trim().slice(0, 40) ?? "",
        })),
    );
  expect(controls).toEqual([]);

  await page.screenshot({
    path: testInfo.outputPath(`journal-${locale}.png`),
    fullPage: true,
    animations: "disabled",
  });
});
