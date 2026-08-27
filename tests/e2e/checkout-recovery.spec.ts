import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

function localServiceClient() {
  const output = execFileSync(
    resolve(process.cwd(), "node_modules/.bin/supabase"),
    ["status", "-o", "env"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
  const local = Object.fromEntries(
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
  return createClient<Database>(local.API_URL, local.SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

test("stale price fails closed and cancelled checkout recovers to cart", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "tablet-768-en",
    "One project owns the stateful recovery mutation.",
  );
  const service = localServiceClient();
  await page.goto("/en/products/syn-00366");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("link", { name: "Cart (1)" }).click();
  await page.getByRole("button", { name: "Review exact total" }).click();
  await expect(page).toHaveURL(/\/en\/checkout\?session=/);
  const checkoutUrl = new URL(page.url());
  const checkoutSessionId = checkoutUrl.searchParams.get("session");
  if (!checkoutSessionId) throw new Error("Checkout session was not rendered.");

  const { data: product } = await service
    .from("products")
    .select("id")
    .eq("sku", "SYN-00366")
    .single();
  const { data: price } = await service
    .from("product_prices")
    .select("id,amount_minor")
    .eq("product_id", product!.id)
    .eq("currency", "GEL")
    .single();
  if (!price) throw new Error("Recovery fixture price was not found.");

  try {
    const changed = await service
      .from("product_prices")
      .update({ amount_minor: price.amount_minor + 100 })
      .eq("id", price.id);
    expect(changed.error).toBeNull();

    const checkout = page.locator("form.checkout-form");
    await checkout.getByLabel("Email").fill("stale-browser@example.test");
    await checkout.getByLabel("Full name").fill("Synthetic Stale Buyer");
    await checkout.getByLabel("Address line 1").fill("3 Test Street");
    await checkout.getByLabel("City").fill("Tbilisi");
    await checkout
      .getByLabel("I accept the store terms and return policy.")
      .check();
    await checkout.getByRole("button", { name: "Place order" }).click();
    await expect(page).toHaveURL(/error=CHECKOUT_STALE/);
    await expect(page.locator(".notice-error")).toContainText(
      "could not safely complete",
    );
  } finally {
    await service
      .from("product_prices")
      .update({ amount_minor: price.amount_minor })
      .eq("id", price.id);
    await service.rpc("release_checkout_session", {
      p_checkout_session_id: checkoutSessionId,
      p_reason: "e2e-recovery-cleanup",
      p_expired: false,
    });
  }

  await page.reload();
  await expect(page.getByText(/missing or expired/i)).toBeVisible();
  await page.getByRole("link", { name: "Back to cart" }).click();
  await expect(page.getByRole("heading", { name: "Cart" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Synthetic Rug 00366" }),
  ).toBeVisible();
});
