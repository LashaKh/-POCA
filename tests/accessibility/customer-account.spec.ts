import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import type { AppLocale } from "@/i18n/routing";
import type { Database } from "@/lib/supabase/database.types";
import { localEnvironment } from "@/tests/support/order-operations";

const localeByProject: Record<string, AppLocale> = {
  "phone-390-ka": "ka",
  "tablet-768-en": "en",
  "desktop-1440-de": "de",
  "firefox-ru": "ru",
  "webkit-en": "en",
};

async function expectAccessibleResponsiveSurface(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("main h1")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
    `document overflow at ${path}`,
  ).toBe(0);
  const undersized = await page
    .locator(
      "main button, main input:not([type='hidden']):not([type='checkbox']):not([type='radio']), main select, main textarea, .account-navigation a, .auth-form a",
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

test("customer auth and account stay accessible across the locale and viewport matrix", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const locale = localeByProject[testInfo.project.name];
  const marker = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const email = `account-a11y-${marker}@epoca.test`;
  const password = `Account-${marker}-Secure-2026!`;
  const local = localEnvironment();
  const service = createClient<Database>(
    local.API_URL,
    local.SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Collector ${locale.toUpperCase()}` },
  });
  if (created.error) throw created.error;

  try {
    for (const path of [
      `/${locale}/auth/sign-in`,
      `/${locale}/auth/sign-up`,
      `/${locale}/auth/recovery`,
    ]) {
      await expectAccessibleResponsiveSurface(page, path);
    }

    await page.goto("/en/auth/sign-in");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/en\/account$/);

    for (const path of [
      `/${locale}/account`,
      `/${locale}/account/orders`,
      `/${locale}/account/addresses`,
      `/${locale}/account/wishlist`,
      `/${locale}/account/settings`,
    ]) {
      await expectAccessibleResponsiveSurface(page, path);
    }

    const firstAccountLink = page.locator(".account-navigation a").first();
    await firstAccountLink.focus();
    await expect(firstAccountLink).toBeFocused();
    await page.screenshot({
      path: `docs/quality/screenshots/customer-account-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${locale}/account$`));
  } finally {
    await service.auth.admin.deleteUser(created.data.user.id);
  }
});
