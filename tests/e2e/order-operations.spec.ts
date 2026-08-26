import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import type { Database } from "@/lib/supabase/database.types";
import {
  createBankTransferOrder,
  createManager,
  localEnvironment,
  signInManager,
} from "@/tests/support/order-operations";

test("guest completes fixture hosted payment with authoritative confirmation", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "tablet-768-en",
    "One project owns the stateful hosted-payment journey.",
  );
  const local = localEnvironment();
  const service = createClient<Database>(
    local.API_URL,
    local.SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const unique = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const productId = crypto.randomUUID();
  const slug = `hosted-payment-${unique}`;
  const productInsert = await service.from("products").insert({
    id: productId,
    sku: `HOSTED-${unique.toUpperCase()}`,
    status: "published",
    readiness_passed: true,
    published_at: new Date().toISOString(),
    width_mm: 1700,
    length_mm: 2500,
    shape: "rectangle",
    materials: ["wool"],
    construction: "hand-knotted",
    colors: ["indigo"],
    styles: ["traditional"],
    condition: "excellent",
    care_code: "professional-clean",
    delivery_class: "parcel",
    search_visible: true,
  });
  if (productInsert.error) throw productInsert.error;
  const inserts = await Promise.all([
    service.from("product_translations").insert({
      product_id: productId,
      locale: "en",
      slug,
      name: "Hosted Payment Carpet",
      short_description: "A safe hosted-payment fixture.",
      long_description:
        "A synthetic product for the hosted-payment browser journey.",
      search_text: "hosted payment carpet",
      alt_text_ready: true,
      status: "published",
    }),
    service.from("product_prices").insert({
      product_id: productId,
      currency: "GEL",
      amount_minor: 250000,
      enabled: true,
    }),
    service.from("inventory_items").insert({
      product_id: productId,
      stock_model: "unique",
      on_hand_quantity: 1,
    }),
  ]);
  for (const insert of inserts) {
    if (insert.error) throw insert.error;
  }

  await page.goto(`/en/products/${slug}`);
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("link", { name: "Cart (1)" }).click();
  await page.getByRole("button", { name: "Review exact total" }).click();
  await page.getByLabel("Email").fill(`hosted-${unique}@example.test`);
  await page.getByLabel("Full name").fill("Hosted Payment Buyer");
  await page.getByLabel("Address line 1").fill("1 Provider Street");
  await page.getByLabel("City").fill("Tbilisi");
  await page.getByLabel("Pay securely online", { exact: false }).check();
  await page.getByLabel("I accept the store terms and return policy.").check();
  await page.getByRole("button", { name: "Place order" }).click();

  await expect(page).toHaveURL(
    /\/en\/payment\/return\?reference=EPO-[A-Z0-9]{12}$/,
  );
  await expect(
    page.getByRole("heading", { name: "Payment status" }),
  ).toBeVisible();
  await expect(
    page.getByText("The bank has confirmed your payment."),
  ).toBeVisible();
  const reference = (await page.getByText(/Order reference:/).innerText())
    .split(" ")
    .at(-1);
  expect(reference).toMatch(/^EPO-[A-Z0-9]{12}$/);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  const order = await service
    .from("orders")
    .select(
      "status,payment_status,payment_attempts(provider,provider_reference),inventory_reservations(status)",
    )
    .eq("reference", reference!)
    .single();
  expect(order.error).toBeNull();
  expect(order.data).toMatchObject({
    status: "confirmed",
    payment_status: "paid",
    payment_attempts: [{ provider: "fixture" }],
    inventory_reservations: [{ status: "converted" }],
  });
});

test("two Managers fulfill, refund, and safely cancel bank-transfer orders", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "tablet-768-en",
    "One project owns the stateful staff-operations journey.",
  );
  const local = localEnvironment();
  const service = createClient<Database>(
    local.API_URL,
    local.SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const [firstManager, secondManager, fulfillmentOrder, cancellationOrder] =
    await Promise.all([
      createManager(service, "First"),
      createManager(service, "Second"),
      createBankTransferOrder(service, "Fulfillment"),
      createBankTransferOrder(service, "Cancellation"),
    ]);

  try {
    const transferReference = `BANK-${fulfillmentOrder.id.slice(0, 12)}`;
    const trackingReference = `TRACK-${fulfillmentOrder.id.slice(0, 12)}`;
    const refundReference = `REFUND-${fulfillmentOrder.id.slice(0, 12)}`;
    await signInManager(page, fulfillmentOrder.id, firstManager);
    await page.getByLabel("Transfer reference").fill(transferReference);
    await page.getByRole("button", { name: "Record first review" }).click();
    await expect(
      page.getByRole("button", { name: "Independently confirm" }),
    ).toBeVisible();

    await page.locator("details.session-menu > summary").click();
    await page.getByRole("button", { name: "Sign out this session" }).click();
    await expect(page).toHaveURL(/\/en\/auth\/signed-out$/);
    await signInManager(page, fulfillmentOrder.id, secondManager);
    await page.getByRole("button", { name: "Independently confirm" }).click();
    await expect(page.locator(".status-paid").first()).toBeVisible();

    await page.getByRole("button", { name: "Start processing" }).click();
    await expect(page.locator(".status-processing").first()).toBeVisible();
    await page.getByLabel("Carrier").fill("ÉPOCA Test Logistics");
    await page.getByLabel("Service level").fill("Worldwide tracked");
    await page.getByLabel("Tracking reference").fill(trackingReference);
    await page
      .getByLabel("Tracking URL")
      .fill(`https://carrier.example/track/${trackingReference}`);
    await page.getByRole("button", { name: "Dispatch shipment" }).click();
    await expect(page.locator(".status-shipped").first()).toBeVisible();
    await page.getByLabel("Safe delivery location").fill("Tbilisi");
    await page.getByRole("button", { name: "Mark delivered" }).click();
    await expect(page.locator(".status-delivered").first()).toBeVisible();

    await page
      .getByLabel(/Refund amount in minor units/)
      .fill(String(fulfillmentOrder.totalMinor));
    await page
      .getByRole("textbox", { name: "Reason", exact: true })
      .fill("E2E full refund confirmation");
    await page.getByLabel("External refund reference").fill(refundReference);
    await page
      .getByLabel("I confirm the amount, reason, and external payment action.")
      .check();
    await page.getByRole("button", { name: "Issue refund" }).click();
    await expect(page.locator(".status-refunded").first()).toBeVisible();

    await page.goto(`/en/admin/orders/${cancellationOrder.id}`);
    await page.getByRole("button", { name: "Cancel order" }).click();
    await expect(page.locator(".status-cancelled").first()).toBeVisible();

    const [fulfilled, cancelled, inventory, notificationLinks] =
      await Promise.all([
        service
          .from("orders")
          .select("status,payment_status,fulfillments(status)")
          .eq("id", fulfillmentOrder.id)
          .single(),
        service
          .from("orders")
          .select("status,payment_status,inventory_reservations(status)")
          .eq("id", cancellationOrder.id)
          .single(),
        service
          .from("inventory_items")
          .select("on_hand_quantity,reserved_quantity")
          .eq("product_id", cancellationOrder.productId)
          .single(),
        service
          .from("order_notification_links")
          .select("purpose")
          .eq("order_id", fulfillmentOrder.id),
      ]);
    expect(fulfilled.error).toBeNull();
    expect(fulfilled.data).toMatchObject({
      status: "refunded",
      payment_status: "refunded",
      fulfillments: [{ status: "delivered" }],
    });
    expect(cancelled.error).toBeNull();
    expect(cancelled.data).toMatchObject({
      status: "cancelled",
      inventory_reservations: [{ status: "released" }],
    });
    expect(inventory.data).toEqual({
      on_hand_quantity: 1,
      reserved_quantity: 0,
    });
    expect(notificationLinks.error).toBeNull();
    expect(notificationLinks.data?.map((link) => link.purpose)).toEqual(
      expect.arrayContaining([
        "order-accepted",
        "payment-confirmed",
        "order-shipped",
        "order-delivered",
        "order-refunded",
      ]),
    );
  } finally {
    await service.auth.admin.deleteUser(firstManager.userId);
    await service.auth.admin.deleteUser(secondManager.userId);
  }
});
