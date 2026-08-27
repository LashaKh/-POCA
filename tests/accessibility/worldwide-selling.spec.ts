import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import type { AppLocale } from "@/i18n/routing";
import type { Database } from "@/lib/supabase/database.types";
import {
  createManager,
  localEnvironment,
} from "@/tests/support/order-operations";
import { waitForCompletedRoute } from "@/tests/support/playwright-route";

const localeByProject: Record<string, AppLocale> = {
  "phone-390-ka": "ka",
  "tablet-768-en": "en",
  "desktop-1440-de": "de",
  "firefox-ru": "ru",
  "webkit-en": "en",
};

async function expectAccessibleResponsiveSurface(page: Page, path: string) {
  await page.goto(path);
  await waitForCompletedRoute(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const layout = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const elements = Array.from(document.querySelectorAll("body *"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const outsideViewport = rect.right > viewport + 1 || rect.left < -1;
        let ancestor = element.parentElement;
        let containedByScroller = false;
        while (ancestor && ancestor !== document.body) {
          const style = getComputedStyle(ancestor);
          if (
            ["auto", "scroll"].includes(style.overflowX) &&
            ancestor.scrollWidth > ancestor.clientWidth
          ) {
            containedByScroller = true;
            break;
          }
          ancestor = ancestor.parentElement;
        }
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
    const originalX = window.scrollX;
    window.scrollTo(50, window.scrollY);
    const rootScrollX = window.scrollX;
    window.scrollTo(originalX, window.scrollY);
    return {
      bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
      rootScrollX,
      elements,
    };
  });
  expect(layout, `document overflow at ${path}`).toEqual({
    bodyOverflow: 0,
    rootScrollX: 0,
    elements: [],
  });
  const undersized = await page
    .locator(
      "main button, main input:not([type='hidden']):not([type='checkbox']):not([type='radio']), main select, main textarea, .admin-navigation a",
    )
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            rect.width > 0 &&
            rect.height > 0 &&
            rect.height < 44
          );
        })
        .map((element) => ({
          html: element.outerHTML.slice(0, 140),
          height: Math.round(element.getBoundingClientRect().height),
        })),
    );
  expect(undersized, `undersized controls at ${path}`).toEqual([]);
}

test("worldwide buyer and Manager surfaces remain accessible across locales, browsers, and viewports", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  const locale = localeByProject[testInfo.project.name];
  const local = localEnvironment();
  const service = createClient<Database>(
    local.API_URL,
    local.SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const marker = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const manager = await createManager(service, `Worldwide-A11y-${marker}`);

  try {
    await expectAccessibleResponsiveSurface(
      page,
      `/${locale}/quote?country=AQ`,
    );
    await page.screenshot({
      path: `docs/quality/screenshots/worldwide-public-${testInfo.project.name}.png`,
      fullPage: true,
    });

    await page.goto("/en/admin/quotes");
    await page.getByLabel("Email").fill(manager.email);
    await page.getByLabel("Password").fill(manager.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/en\/admin\/quotes$/);

    for (const path of [
      `/${locale}/admin/quotes`,
      `/${locale}/admin/promotions`,
      `/${locale}/admin/settings/currencies`,
      `/${locale}/admin/settings/delivery`,
      `/${locale}/admin/settings/markets`,
    ]) {
      await expectAccessibleResponsiveSurface(page, path);
    }
    await page.screenshot({
      path: `docs/quality/screenshots/worldwide-admin-${testInfo.project.name}.png`,
      fullPage: true,
    });
  } finally {
    await service.auth.admin.deleteUser(manager.userId);
  }
});
