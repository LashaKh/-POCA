import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { waitForCompletedRoute } from "@/tests/support/playwright-route";

const scenarios = {
  "phone-390-ka": { locale: "ka", slug: "syn-01002" },
  "tablet-768-en": { locale: "en", slug: "syn-01003" },
  "desktop-1440-de": { locale: "de", slug: "syn-01004" },
  "firefox-ru": { locale: "ru", slug: "syn-01005" },
  "webkit-en": { locale: "en", slug: "syn-01006" },
} as const;

test("checkout review is responsive, localized, and accessible", async ({
  page,
}, testInfo) => {
  const scenario = scenarios[testInfo.project.name as keyof typeof scenarios];
  await page.goto(`/${scenario.locale}/products/${scenario.slug}`);
  await page.locator(".add-to-cart button[type=submit]").click();
  await expect(page.locator(".form-feedback")).not.toBeEmpty();
  await page.locator(".cart-link").click();
  await page.locator(".cart-aside .checkout-form button[type=submit]").click();
  await expect(page).toHaveURL(
    new RegExp(`/${scenario.locale}/checkout\\?session=`),
  );
  await waitForCompletedRoute(page);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({
    path: `docs/quality/screenshots/checkout-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
