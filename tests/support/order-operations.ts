import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

import { type SupabaseClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

import type { Database } from "@/lib/supabase/database.types";

export function localEnvironment() {
  const output = execFileSync(
    resolve(process.cwd(), "node_modules/.bin/supabase"),
    ["status", "-o", "env"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
  return Object.fromEntries(
    output
      .split("\n")
      .filter((line) => line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [
          line.slice(0, separator),
          JSON.parse(line.slice(separator + 1)),
        ];
      }),
  ) as Record<string, string>;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function createManager(
  service: SupabaseClient<Database>,
  label: string,
) {
  const unique = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const email = `operations-${label}-${unique}@epoca.test`;
  const password = `E2e-${label}-${unique}-Safe!`;
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  const userId = created.data.user.id;
  const profile = await service.from("profiles").insert({
    id: userId,
    profile_kind: "staff",
    display_name: `${label} Manager`,
    locale: "en",
  });
  if (profile.error) throw profile.error;
  const staff = await service.from("staff_members").insert({
    profile_id: userId,
    role: "manager",
    active: true,
    mfa_required: false,
    activated_at: new Date().toISOString(),
  });
  if (staff.error) throw staff.error;
  return { email, password, userId };
}

export async function signInManager(
  page: Page,
  orderId: string,
  manager: { email: string; password: string },
) {
  await page.goto(`/en/admin/orders/${orderId}`);
  await page.getByLabel("Email").fill(manager.email);
  await page.getByLabel("Password").fill(manager.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`/en/admin/orders/${orderId}$`));
}

export async function createBankTransferOrder(
  service: SupabaseClient<Database>,
  label: string,
  locale: Database["public"]["Enums"]["app_locale"] = "en",
) {
  const unique = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const productId = crypto.randomUUID();
  const product = await service.from("products").insert({
    id: productId,
    sku: `BANK-${unique.toUpperCase()}`,
    status: "published",
    readiness_passed: true,
    published_at: new Date().toISOString(),
    width_mm: 1800,
    length_mm: 2700,
    shape: "rectangle",
    materials: ["wool"],
    construction: "hand-knotted",
    colors: ["ochre"],
    styles: ["traditional"],
    condition: "excellent",
    care_code: "professional-clean",
    delivery_class: "parcel",
    search_visible: true,
  });
  if (product.error) throw product.error;
  const related = await Promise.all([
    service.from("product_translations").insert({
      product_id: productId,
      locale,
      slug: `bank-operations-${unique}`,
      name: `${label} operations carpet`,
      short_description: "A synthetic bank-transfer operations fixture.",
      long_description: "A synthetic browser fixture for staff operations.",
      search_text: "bank transfer operations carpet",
      alt_text_ready: true,
      status: "published",
    }),
    service.from("product_prices").insert({
      product_id: productId,
      currency: "GEL",
      amount_minor: 175000,
      enabled: true,
    }),
    service.from("inventory_items").insert({
      product_id: productId,
      stock_model: "unique",
      on_hand_quantity: 1,
    }),
  ]);
  for (const result of related) if (result.error) throw result.error;

  const secretHash = sha256(`guest:${unique}`);
  const guest = await service.rpc("create_guest_context", {
    p_secret_hash: secretHash,
    p_locale: locale,
    p_currency: "GEL",
  });
  if (guest.error) throw guest.error;
  const cart = await service.rpc("add_guest_cart_item", {
    p_secret_hash: secretHash,
    p_product_id: productId,
    p_quantity: 1,
  });
  if (cart.error) throw cart.error;
  const reserved = await service.rpc("reserve_guest_checkout", {
    p_secret_hash: secretHash,
    p_country_code: "GE",
    p_method_code: "standard-test",
  });
  if (reserved.error) throw reserved.error;
  const checkoutQuote = await service
    .from("delivery_quotes")
    .select("total_minor")
    .eq("id", reserved.data.quote_id)
    .single();
  if (checkoutQuote.error) throw checkoutQuote.error;
  const accepted = await service.rpc("accept_guest_order", {
    p_secret_hash: secretHash,
    p_checkout_session_id: reserved.data.id,
    p_expected_total_minor: checkoutQuote.data.total_minor,
    p_accept_changes: false,
    p_idempotency_key_hash: sha256(`idempotency:${unique}`),
    p_request_hash: sha256(`request:${unique}`),
    p_guest_proof_hash: sha256(`proof:${unique}`),
    p_contact_email: `buyer-${unique}@example.test`,
    p_contact_phone: "",
    p_address: {
      fullName: `${label} Buyer`,
      line1: "1 Operations Street",
      city: "Tbilisi",
      countryCode: "GE",
    },
    p_payment_method: "bank_transfer",
    p_terms_version: "terms-test-v1",
  });
  if (accepted.error) throw accepted.error;
  return {
    id: accepted.data.id,
    totalMinor: accepted.data.total_minor,
    productId,
    secretHash,
    guestProofHash: sha256(`proof:${unique}`),
  };
}
