import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import type { AppLocale } from "@/i18n/routing";
import {
  createAccessStaff,
  enrollOwnerMfa,
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

test("Owner auth, settings, and audit remain accessible and responsive", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const locale = localeByProject[testInfo.project.name];
  const owner = await createAccessStaff(localServiceClient(), "owner");
  await signInStaff(page, owner);
  await expect(page).toHaveURL(/\/en\/auth\/mfa/);
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
  await enrollOwnerMfa(page);

  for (const path of [
    `/${locale}/admin/settings/integrations`,
    `/${locale}/admin/settings/privacy`,
    `/${locale}/admin/settings/staff`,
    `/${locale}/admin/audit`,
    `/${locale}/admin/operations`,
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "We could not load this page." }),
    ).toHaveCount(0);
    await waitForCompletedRoute(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    const overflowing = await page.evaluate(() => {
      const viewport = document.documentElement.clientWidth;
      return Array.from(document.querySelectorAll("body *"))
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const outsideViewport = rect.right > viewport + 1 || rect.left < -1;
          const containedByScroller = Array.from(
            element.parentElement?.closest("body")
              ? generateAncestors(element.parentElement)
              : [],
          ).some((ancestor) => {
            const style = getComputedStyle(ancestor);
            return (
              ["auto", "scroll"].includes(style.overflowX) &&
              ancestor.scrollWidth > ancestor.clientWidth
            );
          });
          return outsideViewport && !containedByScroller;
        })
        .slice(0, 12)
        .map((element) => ({
          tag: element.tagName.toLowerCase(),
          className: element.getAttribute("class") ?? "",
          text: element.textContent?.trim().slice(0, 80) ?? "",
          right: Math.round(element.getBoundingClientRect().right),
          viewport,
        }));

      function* generateAncestors(element: Element | null) {
        let current = element;
        while (current && current !== document.body) {
          yield current;
          current = current.parentElement;
        }
      }
    });
    expect(overflowing, `horizontal overflow at ${path}`).toEqual([]);
    const undersized = await page
      .locator("button, input, select, summary")
      .evaluateAll((elements) =>
        elements
          .filter((element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return (
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              rect.width > 0 &&
              rect.height > 0
            );
          })
          .filter((element) => element.getBoundingClientRect().height < 44)
          .map((element) => element.outerHTML.slice(0, 120)),
      );
    expect(undersized).toEqual([]);
  }
  await page.screenshot({
    path: `docs/quality/screenshots/admin-access-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
