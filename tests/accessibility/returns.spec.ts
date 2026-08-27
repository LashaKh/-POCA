import { createHash } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import type { AppLocale } from "@/i18n/routing";
import type { Database } from "@/lib/supabase/database.types";
import {
  createBankTransferOrder,
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

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function deliverOrder(
  service: SupabaseClient<Database>,
  order: { id: string; productId: string },
  marker: string,
) {
  const updates = await Promise.all([
    service
      .from("orders")
      .update({ status: "delivered", payment_status: "paid" })
      .eq("id", order.id),
    service
      .from("payment_attempts")
      .update({ status: "paid" })
      .eq("order_id", order.id),
    service
      .from("inventory_items")
      .update({ on_hand_quantity: 0, reserved_quantity: 0 })
      .eq("product_id", order.productId),
  ]);
  for (const update of updates) {
    if (update.error) throw update.error;
  }
  const fulfillment = await service.from("fulfillments").insert({
    order_id: order.id,
    status: "delivered",
    carrier: "Accessibility fixture",
    service_level: "Worldwide tracked",
    tracking_reference: `A11Y-${marker}`,
    dispatched_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    delivered_at: new Date(Date.now() - 86_400_000).toISOString(),
  });
  if (fulfillment.error) throw fulfillment.error;
}

async function expectAccessibleResponsiveSurface(page: Page, path: string) {
  await page.goto(path);
  await waitForCompletedRoute(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const layout = await page.evaluate(() => ({
    overflow:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    elements: Array.from(document.querySelectorAll("body *"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.right > document.documentElement.clientWidth + 1 ||
          rect.left < -1
        );
      })
      .slice(0, 12)
      .map((element) => ({
        html: element.outerHTML.slice(0, 180),
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
      })),
  }));
  expect(
    layout.overflow,
    `document overflow at ${path}: ${JSON.stringify(layout.elements)}`,
  ).toBe(0);
  const undersized = await page
    .locator(
      "main button, main input:not([type='hidden']):not([type='checkbox']):not([type='radio']), main select, main textarea, .account-navigation a, .admin-navigation a",
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

test("buyer and Manager return surfaces remain accessible across locales, browsers, and viewports", async ({
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
  const email = `return-a11y-${marker}@epoca.test`;
  const password = `Return-${marker}-Secure-2026!`;
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    throw created.error ?? new Error("RETURN_A11Y_CUSTOMER_NOT_CREATED");
  }
  const manager = await createManager(service, `Return-A11y-${marker}`);
  const customer = createClient<Database>(
    local.API_URL,
    local.PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  try {
    const signedIn = await customer.auth.signInWithPassword({
      email,
      password,
    });
    if (signedIn.error) throw signedIn.error;
    const initialized = await customer.rpc("initialize_customer_profile", {
      p_display_name: `Return accessibility ${locale}`,
      p_locale: locale,
      p_currency: "GEL",
    });
    if (initialized.error) throw initialized.error;
    const order = await createBankTransferOrder(
      service,
      `Return accessibility ${locale}`,
      locale,
    );
    const merged = await service.rpc("merge_customer_guest_data", {
      p_secret_hash: order.secretHash,
      p_new_secret_hash: sha256(`a11y-merged:${marker}`),
      p_customer_profile_id: created.data.user.id,
      p_idempotency_key_hash: sha256(`a11y-merge:${marker}`),
    });
    if (merged.error) throw merged.error;
    await deliverOrder(service, order, marker);
    const line = await customer
      .from("order_lines")
      .select("id")
      .eq("order_id", order.id)
      .single();
    if (line.error) throw line.error;
    const submitted = await customer.rpc("submit_return_request", {
      p_order_id: order.id,
      p_request_kind: "return",
      p_reason_code: "not_as_described",
      p_buyer_note: "Accessibility return record",
      p_line_items: [{ lineId: line.data.id, quantity: 1 }],
      p_idempotency_key_hash: sha256(`a11y-return:${marker}`),
      p_guest_proof_hash: undefined,
    });
    if (submitted.error) throw submitted.error;
    const orderRecord = await service
      .from("orders")
      .select("reference")
      .eq("id", order.id)
      .single();
    if (orderRecord.error) throw orderRecord.error;

    await page.goto(
      `/en/auth/sign-in?returnTo=${encodeURIComponent(`/account/returns/${submitted.data.id}`)}`,
    );
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/en/account/returns/${submitted.data.id}$`),
    );
    await expectAccessibleResponsiveSurface(
      page,
      `/${locale}/order/${orderRecord.data.reference}/request?returnId=${submitted.data.id}`,
    );
    await expectAccessibleResponsiveSurface(
      page,
      `/${locale}/account/returns/${submitted.data.id}`,
    );

    await page.context().clearCookies();
    await page.goto(`/en/admin/returns/${submitted.data.id}`);
    await page.getByLabel("Email").fill(manager.email);
    await page.getByLabel("Password").fill(manager.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/en/admin/returns/${submitted.data.id}$`),
    );
    await expectAccessibleResponsiveSurface(page, `/${locale}/admin/returns`);
    await expectAccessibleResponsiveSurface(
      page,
      `/${locale}/admin/returns/${submitted.data.id}`,
    );
    await page.screenshot({
      path: `docs/quality/screenshots/returns-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await expectAccessibleResponsiveSurface(
      page,
      `/${locale}/admin/settings/returns`,
    );
  } finally {
    await service.auth.admin.deleteUser(created.data.user.id);
    await service.auth.admin.deleteUser(manager.userId);
  }
});
