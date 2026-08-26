import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const localeByProject = {
  "phone-390-ka": "ka",
  "tablet-768-en": "en",
  "desktop-1440-de": "de",
  "firefox-ru": "ru",
  "webkit-en": "en",
} as const;

test("localized not-found state is reflow-safe and accessible", async ({
  page,
}, testInfo) => {
  const locale =
    localeByProject[testInfo.project.name as keyof typeof localeByProject];
  const response = await page.goto(`/${locale}/not-a-published-epoca-page`);
  expect(response?.status()).toBe(404);
  await expect(page.locator(".system-state h1")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("static offline and maintenance fallbacks remain accessible without app data", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "tablet-768-en",
    "One browser covers the deliberately static multilingual documents.",
  );
  for (const path of ["/offline.html", "/maintenance.html"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator('section[lang="ka"]')).toBeVisible();
    await expect(page.locator('section[lang="ru"]')).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});
