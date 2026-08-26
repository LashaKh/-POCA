import { createHash } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import type { Database } from "@/lib/supabase/database.types";
import {
  createBankTransferOrder,
  createManager,
  localEnvironment,
} from "@/tests/support/order-operations";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function deliverOrder(
  service: SupabaseClient<Database>,
  order: { id: string; productId: string },
  marker: string,
  deliveredDaysAgo = 1,
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
    carrier: "ÉPOCA Return Journey",
    service_level: "Worldwide tracked",
    tracking_reference: `RETURN-${marker}`,
    dispatched_at: new Date(
      Date.now() - (deliveredDaysAgo + 1) * 86_400_000,
    ).toISOString(),
    delivered_at: new Date(
      Date.now() - deliveredDaysAgo * 86_400_000,
    ).toISOString(),
  });
  if (fulfillment.error) throw fulfillment.error;
}

test("customer evidence, manager inspection, refund, and restock complete one return safely", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "tablet-768-en",
    "One browser owns the stateful return journey.",
  );
  test.setTimeout(120_000);
  const local = localEnvironment();
  const service = createClient<Database>(
    local.API_URL,
    local.SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const marker = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const email = `return-customer-${marker}@epoca.test`;
  const password = `Return-${marker}-Secure-2026!`;
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    throw created.error ?? new Error("RETURN_CUSTOMER_NOT_CREATED");
  }
  const manager = await createManager(service, `Return-${marker}`);
  const customer = createClient<Database>(
    local.API_URL,
    local.PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  try {
    const signIn = await customer.auth.signInWithPassword({ email, password });
    if (signIn.error) throw signIn.error;
    const initialized = await customer.rpc("initialize_customer_profile", {
      p_display_name: "Return Journey Collector",
      p_locale: "en",
      p_currency: "GEL",
    });
    if (initialized.error) throw initialized.error;
    const order = await createBankTransferOrder(
      service,
      `Browser return ${marker}`,
    );
    const merged = await service.rpc("merge_customer_guest_data", {
      p_secret_hash: order.secretHash,
      p_new_secret_hash: sha256(`merged:${marker}`),
      p_customer_profile_id: created.data.user.id,
      p_idempotency_key_hash: sha256(`merge:${marker}`),
    });
    if (merged.error) throw merged.error;
    await deliverOrder(service, order, marker);
    const orderRecord = await service
      .from("orders")
      .select("reference")
      .eq("id", order.id)
      .single();
    if (orderRecord.error) throw orderRecord.error;

    await page.goto(`/en/account/orders/${orderRecord.data.reference}`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/en/account/orders/${orderRecord.data.reference}$`),
    );
    await page.getByRole("link", { name: "Return an item" }).click();
    await expect(
      page.getByRole("heading", { name: "Request a return" }),
    ).toBeVisible();
    await page.getByLabel("Reason").selectOption("damaged");
    await page
      .getByLabel("What happened?")
      .fill("The edge was visibly damaged during delivery.");
    await page.getByRole("button", { name: "Submit request" }).click();
    await expect(page.getByText(/Request submitted:/)).toBeVisible();
    await page.getByRole("link", { name: "View request status" }).click();
    await expect(page.getByText("Requested", { exact: true })).toBeVisible();

    await page.getByLabel("JPEG, PNG, or WebP image").setInputFiles({
      name: "damaged-edge.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x01]),
    });
    await page.getByRole("button", { name: "Upload evidence" }).click();
    await expect(page.getByText("Evidence uploaded privately.")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "damaged-edge.jpg" }),
    ).toBeVisible();

    const requestRecord = await service
      .from("return_requests")
      .select("id,reference")
      .eq("order_id", order.id)
      .single();
    if (requestRecord.error) throw requestRecord.error;

    await page.context().clearCookies();
    await page.goto(`/en/admin/returns/${requestRecord.data.id}`);
    await page.getByLabel("Email").fill(manager.email);
    await page.getByLabel("Password").fill(manager.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/en/admin/returns/${requestRecord.data.id}$`),
    );
    await expect(
      page.getByRole("link", { name: "damaged-edge.jpg" }),
    ).toBeVisible();

    await page
      .getByLabel("Buyer-visible message")
      .fill("Please confirm that the original packaging is available.");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.locator(".admin-page-header p").last()).toContainText(
      "Information needed",
    );
    await page.getByLabel("Decision").selectOption("approve");
    await page
      .getByLabel("Buyer-visible reason")
      .fill("The photographed damage is covered by the recorded policy.");
    await page.getByRole("button", { name: "Record decision" }).click();
    await expect(page.locator(".admin-page-header p").last()).toContainText(
      "Approved",
    );
    await page
      .getByLabel("Receipt note")
      .fill("The carpet and packaging were received together.");
    await page.getByRole("button", { name: "Record receipt" }).click();
    await expect(page.locator(".admin-page-header p").last()).toContainText(
      "Received",
    );

    await page
      .getByLabel("Inspection summary")
      .fill("Edge damage confirmed; carpet remains saleable after repair.");
    await page.getByLabel("Package condition").fill("Intact");
    await page.locator('select[name="condition"]').selectOption("damaged");
    await page
      .locator('select[name="restockDecision"]')
      .selectOption("restock");
    await page.getByLabel(/Refund in minor units/).fill("50000");
    await page.getByLabel("Item note").fill("Partial refund after inspection.");
    await page.getByRole("button", { name: "Record inspection" }).click();
    await expect(page.locator(".admin-page-header p").last()).toContainText(
      "Inspected",
    );
    await page
      .getByRole("textbox", { name: "Reason", exact: true })
      .fill("Inspected partial return refund");
    await page
      .getByLabel("External refund reference")
      .fill(`BANK-RETURN-${marker}`);
    await page.getByRole("button", { name: "Issue refund" }).click();
    await expect(page.locator(".admin-page-header p").last()).toContainText(
      "Refunded",
    );
    await page.getByRole("button", { name: "Apply restock" }).click();
    await expect
      .poll(async () => {
        const links = await service
          .from("return_restock_links")
          .select("id", { count: "exact", head: true })
          .eq("return_request_id", requestRecord.data.id);
        if (links.error) throw links.error;
        return links.count;
      })
      .toBe(1);

    const [effects, inventory] = await Promise.all([
      service
        .from("return_requests")
        .select("status,return_refund_links(id),return_restock_links(id)")
        .eq("id", requestRecord.data.id)
        .single(),
      service
        .from("inventory_items")
        .select("on_hand_quantity,reserved_quantity")
        .eq("product_id", order.productId)
        .single(),
    ]);
    expect(effects.data).toMatchObject({ status: "refunded" });
    expect(effects.data?.return_refund_links).toHaveLength(1);
    expect(effects.data?.return_restock_links).toHaveLength(1);
    expect(inventory.data).toEqual({
      on_hand_quantity: 1,
      reserved_quantity: 0,
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  } finally {
    await service.auth.admin.deleteUser(created.data.user.id);
    await service.auth.admin.deleteUser(manager.userId);
  }
});

test("buyer sees an expired window and a reasoned rejection without losing order privacy", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "tablet-768-en",
    "One browser owns the stateful return exception journey.",
  );
  const local = localEnvironment();
  const service = createClient<Database>(
    local.API_URL,
    local.SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const marker = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const email = `return-exception-${marker}@epoca.test`;
  const password = `Return-${marker}-Exception-2026!`;
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    throw created.error ?? new Error("RETURN_EXCEPTION_CUSTOMER_NOT_CREATED");
  }
  const managerIdentity = await createManager(
    service,
    `Return-Exception-${marker}`,
  );
  const customer = createClient<Database>(
    local.API_URL,
    local.PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const manager = createClient<Database>(local.API_URL, local.PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const customerSignIn = await customer.auth.signInWithPassword({
      email,
      password,
    });
    if (customerSignIn.error) throw customerSignIn.error;
    const initialized = await customer.rpc("initialize_customer_profile", {
      p_display_name: "Return Exception Collector",
      p_locale: "en",
      p_currency: "GEL",
    });
    if (initialized.error) throw initialized.error;
    const managerSignIn = await manager.auth.signInWithPassword({
      email: managerIdentity.email,
      password: managerIdentity.password,
    });
    if (managerSignIn.error) throw managerSignIn.error;

    const expiredOrder = await createBankTransferOrder(
      service,
      `Expired return ${marker}`,
    );
    const expiredMerge = await service.rpc("merge_customer_guest_data", {
      p_secret_hash: expiredOrder.secretHash,
      p_new_secret_hash: sha256(`expired-merged:${marker}`),
      p_customer_profile_id: created.data.user.id,
      p_idempotency_key_hash: sha256(`expired-merge:${marker}`),
    });
    if (expiredMerge.error) throw expiredMerge.error;
    await deliverOrder(service, expiredOrder, `EXPIRED-${marker}`, 60);
    const expiredReference = await service
      .from("orders")
      .select("reference")
      .eq("id", expiredOrder.id)
      .single();
    if (expiredReference.error) throw expiredReference.error;

    const rejectedOrder = await createBankTransferOrder(
      service,
      `Rejected return ${marker}`,
    );
    const rejectedMerge = await service.rpc("merge_customer_guest_data", {
      p_secret_hash: rejectedOrder.secretHash,
      p_new_secret_hash: sha256(`rejected-merged:${marker}`),
      p_customer_profile_id: created.data.user.id,
      p_idempotency_key_hash: sha256(`rejected-merge:${marker}`),
    });
    if (rejectedMerge.error) throw rejectedMerge.error;
    await deliverOrder(service, rejectedOrder, `REJECTED-${marker}`);
    const rejectedLine = await customer
      .from("order_lines")
      .select("id")
      .eq("order_id", rejectedOrder.id)
      .single();
    if (rejectedLine.error) throw rejectedLine.error;
    const submitted = await customer.rpc("submit_return_request", {
      p_order_id: rejectedOrder.id,
      p_request_kind: "return",
      p_reason_code: "changed_mind",
      p_buyer_note: "Reasoned rejection browser fixture",
      p_line_items: [{ lineId: rejectedLine.data.id, quantity: 1 }],
      p_idempotency_key_hash: sha256(`rejected-return:${marker}`),
      p_guest_proof_hash: undefined,
    });
    if (submitted.error) throw submitted.error;
    const rejected = await manager.rpc("decide_return_request", {
      p_return_request_id: submitted.data.id,
      p_expected_version: submitted.data.version,
      p_approve: false,
      p_reason: "The recorded exception criteria are not met.",
      p_idempotency_key: `rejected-decision-${marker}`,
    });
    if (rejected.error) throw rejected.error;

    await page.goto(
      `/en/auth/sign-in?returnTo=${encodeURIComponent(`/order/${expiredReference.data.reference}/request`)}`,
    );
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/en/order/${expiredReference.data.reference}/request$`),
    );
    await expect(
      page.getByText("This request is not currently eligible."),
    ).toBeVisible();
    await expect(
      page.getByText("The configured return window has expired."),
    ).toBeVisible();

    await page.goto(`/en/account/returns/${submitted.data.id}`);
    await expect(page.getByText("Rejected", { exact: true })).toBeVisible();
    await expect(
      page.getByText("The recorded exception criteria are not met."),
    ).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  } finally {
    await service.auth.admin.deleteUser(created.data.user.id);
    await service.auth.admin.deleteUser(managerIdentity.userId);
  }
});
