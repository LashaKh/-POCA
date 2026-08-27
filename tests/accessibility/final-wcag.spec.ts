import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import type { AppLocale } from "@/i18n/routing";
import {
  createAccessStaff,
  localServiceClient,
  signInStaff,
} from "@/tests/support/admin-access";
import { waitForCompletedRoute } from "@/tests/support/playwright-route";

const localeByProject: Record<string, AppLocale> = {
  "phone-390-ka": "ka",
  "tablet-768-en": "en",
  "desktop-1440-de": "de",
  "firefox-ru": "ru",
  "webkit-en": "en",
};

const publicRoutes = [
  "",
  "/collections/synthetic-collection",
  "/products/syn-00001",
  "/cart",
  "/checkout",
  "/contact",
  "/auth/sign-in",
] as const;

const adminRoutes = [
  "/admin",
  "/admin/products",
  "/admin/ingestion",
  "/admin/orders",
  "/admin/returns",
  "/admin/reports",
  "/admin/content",
] as const;

async function expectAccessiblePage(page: Page, pathName: string) {
  const response = await page.goto(pathName, { waitUntil: "domcontentloaded" });
  expect(response?.status(), pathName).toBeLessThan(400);
  await waitForCompletedRoute(page);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations, pathName).toEqual([]);
  const undersizedControls = await page
    .locator(
      "main button, main input:not([type='hidden']):not([type='checkbox']):not([type='radio']), main select, main textarea",
    )
    .evaluateAll((elements) =>
      elements.flatMap((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.height < 44
          ? [
              {
                name:
                  element.getAttribute("aria-label") ??
                  element.textContent?.trim() ??
                  element.getAttribute("name") ??
                  element.tagName,
                height: rect.height,
              },
            ]
          : [];
      }),
    );
  expect(undersizedControls, pathName).toEqual([]);
}

test("critical shop journeys satisfy the final WCAG 2.2 AA audit", async ({
  page,
}, testInfo) => {
  test.setTimeout(6 * 60_000);
  const locale = localeByProject[testInfo.project.name];
  const service = localServiceClient();
  const manager = await createAccessStaff(service, "manager");
  const originalViewport = page.viewportSize() ?? { width: 1440, height: 1000 };

  try {
    await page.goto(`/${locale}`);
    await page.locator(".skip-link").focus();
    await expect(page.locator(".skip-link")).toBeFocused();
    await expect(page.locator(".skip-link")).toBeVisible();

    for (const route of publicRoutes) {
      await expectAccessiblePage(page, `/${locale}${route}`);
    }
    await page.goto(`/${locale}/collections/synthetic-collection`);
    await expect(page.locator('[aria-live="polite"]').first()).not.toBeEmpty();

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    const transitionSeconds = await page
      .locator("main button")
      .first()
      .evaluate((element) =>
        getComputedStyle(element)
          .transitionDuration.split(",")
          .map((value) => Number.parseFloat(value) || 0),
      );
    expect(Math.max(...transitionSeconds)).toBeLessThanOrEqual(0.02);
    await page.emulateMedia({ reducedMotion: "no-preference" });

    await page.setViewportSize({ width: 320, height: 800 });
    for (const route of ["/products/syn-00001", "/checkout"] as const) {
      await page.goto(`/${locale}${route}`);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
        `320px reflow: ${route}`,
      ).toBeLessThanOrEqual(1);
    }

    await page.setViewportSize(originalViewport);
    await signInStaff(page, manager);
    await expect(page).toHaveURL(/\/en\/admin$/);
    for (const route of adminRoutes) {
      await expectAccessiblePage(page, `/${locale}${route}`);
    }

    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`/${locale}/admin/reports`);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
      "320px admin report reflow",
    ).toBeLessThanOrEqual(1);
  } finally {
    await service.auth.admin.deleteUser(manager.userId);
  }
});
