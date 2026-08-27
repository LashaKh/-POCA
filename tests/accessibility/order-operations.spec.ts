import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import type { AppLocale } from "@/i18n/routing";
import type { Database } from "@/lib/supabase/database.types";
import {
  createBankTransferOrder,
  createManager,
  localEnvironment,
  signInManager,
} from "@/tests/support/order-operations";
import { waitForCompletedRoute } from "@/tests/support/playwright-route";

const localeByProject: Record<string, AppLocale> = {
  "phone-390-ka": "ka",
  "tablet-768-en": "en",
  "desktop-1440-de": "de",
  "firefox-ru": "ru",
  "webkit-en": "en",
};

test("order operations remain accessible across locales and viewports", async ({
  page,
}, testInfo) => {
  const locale = localeByProject[testInfo.project.name];
  const local = localEnvironment();
  const service = createClient<Database>(
    local.API_URL,
    local.SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const manager = await createManager(service, `A11y-${locale}`);
  const order = await createBankTransferOrder(
    service,
    `Accessibility ${locale}`,
    locale,
  );
  const providerReference = `A11Y-${order.id.slice(0, 16)}`;
  const reconciled = await service.rpc("reconcile_payment", {
    p_order_id: order.id,
    p_provider_event_key: `a11y-payment:${order.id}`,
    p_target_status: "paid",
    p_amount_minor: order.totalMinor,
    p_currency: "GEL",
    p_provider_reference: providerReference,
    p_provider_event_inbox_id: undefined,
  });
  if (reconciled.error) throw reconciled.error;

  try {
    await signInManager(page, order.id, manager);
    await page.goto(`/${locale}/admin/orders/${order.id}`);
    await waitForCompletedRoute(page);

    const layout = await page.evaluate(() => ({
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      controlHeights: Array.from(
        document.querySelectorAll(
          "button, input:not([type='hidden']):not([type='checkbox']):not([type='radio']), select, textarea",
        ),
      )
        .map((element) => element.getBoundingClientRect())
        .filter((rect) => rect.width > 0 && rect.height > 0)
        .map((rect) => rect.height),
    }));
    expect(layout.overflow).toBe(0);
    expect(layout.controlHeights.length).toBeGreaterThan(0);
    expect(Math.min(...layout.controlHeights)).toBeGreaterThanOrEqual(44);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
    await page
      .getByLabel(/Note|Notiz|Заметка|შენიშვნა/)
      .fill(
        "A deliberately long operational note that checks practical wrapping without saving customer information or changing the order.",
      );
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `docs/quality/screenshots/order-operations-${testInfo.project.name}.png`,
      fullPage: true,
    });
  } finally {
    await service.auth.admin.deleteUser(manager.userId);
  }
});
