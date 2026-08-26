import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import type { AppLocale } from "@/i18n/routing";
import type { Database } from "@/lib/supabase/database.types";
import {
  createManager,
  localEnvironment,
} from "@/tests/support/order-operations";

const localeByProject: Record<string, AppLocale> = {
  "phone-390-ka": "ka",
  "tablet-768-en": "en",
  "desktop-1440-de": "de",
  "firefox-ru": "ru",
  "webkit-en": "en",
};

async function expectAccessibleSurface(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("main h1")).toBeVisible();
  await page.locator("details").evaluateAll((details) => {
    for (const detail of details) (detail as HTMLDetailsElement).open = true;
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const layout = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const elements = Array.from(document.querySelectorAll("body *"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const outside = rect.right > viewport + 1 || rect.left < -1;
        let ancestor = element.parentElement;
        while (ancestor && ancestor !== document.body) {
          const style = getComputedStyle(ancestor);
          if (
            ["auto", "scroll"].includes(style.overflowX) &&
            ancestor.scrollWidth > ancestor.clientWidth
          )
            return false;
          ancestor = ancestor.parentElement;
        }
        return outside;
      })
      .slice(0, 10)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        className: element.getAttribute("class") ?? "",
        text: element.textContent?.trim().slice(0, 60) ?? "",
        right: Math.round(element.getBoundingClientRect().right),
        viewport,
      }));
    const start = window.scrollX;
    window.scrollTo(60, window.scrollY);
    const rootScrollX = window.scrollX;
    window.scrollTo(start, window.scrollY);
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
      "button:not(.visually-hidden), input:not([type='hidden']):not([type='checkbox']):not([type='radio']), select, textarea, summary, .admin-navigation a",
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

test("content, service, contact, consent, and administration remain accessible across the supported matrix", async ({
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
  const manager = await createManager(
    service,
    `Content-A11y-${crypto.randomUUID().slice(0, 8)}`,
  );
  try {
    for (const path of [
      `/${locale}`,
      `/${locale}/about`,
      `/${locale}/privacy`,
      `/${locale}/contact`,
      `/${locale}/journal`,
    ])
      await expectAccessibleSurface(page, path);
    await page.screenshot({
      path: `docs/quality/screenshots/content-public-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await page.goto("/en/admin/content");
    await page.getByLabel("Email").fill(manager.email);
    await page.getByLabel("Password").fill(manager.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/en\/admin\/content$/);
    for (const path of [
      `/${locale}/admin/content`,
      `/${locale}/admin/content/new`,
      `/${locale}/admin/content/navigation`,
      `/${locale}/admin/content/redirects`,
    ])
      await expectAccessibleSurface(page, path);
    await page.screenshot({
      path: `docs/quality/screenshots/content-admin-${testInfo.project.name}.png`,
      fullPage: true,
    });
  } finally {
    await service.auth.admin.deleteUser(manager.userId);
  }
});
