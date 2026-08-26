import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

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

test("guest cart persists and accepts one recoverable bank-transfer order", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "tablet-768-en",
    "One project owns the stateful last-item purchase.",
  );
  await page.goto("/en/products/syn-00365");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Cart (1)" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("link", { name: "Cart (1)" })).toBeVisible();
  await page.getByRole("link", { name: "Cart (1)" }).click();
  await expect(
    page.getByRole("heading", { name: "Synthetic Rug 00365" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Cart items" }).getByText("GEL 1,236.50"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Review exact total" }).click();
  await expect(page).toHaveURL(/\/en\/checkout\?session=/);
  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
  await expect(
    page.getByText("Local test only — do not transfer funds."),
  ).toBeVisible();

  await page.getByLabel("Email").fill("browser-buyer@example.test");
  await page.getByLabel("Phone (optional)").fill("+995555000001");
  await page.getByLabel("Full name").fill("Synthetic Browser Buyer");
  await page.getByLabel("Address line 1").fill("2 Test Street");
  await page.getByLabel("City").fill("Tbilisi");
  await page.getByLabel("I accept the store terms and return policy.").check();
  await page.getByRole("button", { name: "Place order" }).click();

  await expect(page).toHaveURL(/\/en\/order\/EPO-[A-Z0-9]{12}$/);
  const reference = (await page.getByText(/Order reference:/).innerText())
    .split(" ")
    .at(-1);
  expect(reference).toMatch(/^EPO-[A-Z0-9]{12}$/);
  await expect(page.getByText("Bank transfer pending")).toBeVisible();
  await expect(
    page.getByText(reference ?? "missing-reference", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Cart (0)" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Thank you." })).toBeVisible();
  await page.getByRole("link", { name: "Deutsch", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/de/order/${reference}$`));
  await expect(
    page.getByRole("heading", { name: "Vielen Dank." }),
  ).toBeVisible();

  if (!reference) throw new Error("Order reference was not rendered.");
  const service = localServiceClient();
  const { data: order, error: orderError } = await service
    .from("orders")
    .select(
      "id,reference,inventory_reservations(id,status),order_notification_links(notifications(status))",
    )
    .eq("reference", reference)
    .single();
  expect(orderError).toBeNull();
  if (!order) throw new Error("Accepted order was not persisted.");
  expect(order.reference).toBe(reference);
  expect(order.inventory_reservations).toHaveLength(1);
  expect(order.inventory_reservations[0].status).toBe("active");
  expect(order.order_notification_links).toHaveLength(1);
  expect(order.order_notification_links[0].notifications?.status).toBe("sent");

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});
