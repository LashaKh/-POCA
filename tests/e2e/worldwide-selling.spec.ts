import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import type { Database } from "@/lib/supabase/database.types";
import {
  createManager,
  localEnvironment,
} from "@/tests/support/order-operations";

test("buyer language/currency, invalid discount, customs, manual quote, and staff resolution stay truthful", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "tablet-768-en",
    "One browser owns the stateful worldwide journey.",
  );
  test.setTimeout(120_000);
  const local = localEnvironment();
  const service = createClient<Database>(
    local.API_URL,
    local.SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const marker = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const productId = crypto.randomUUID();
  const slug = `world-browser-${marker}`;
  const manager = await createManager(service, `World-Browser-${marker}`);
  const created = await service.from("products").insert({
    id: productId,
    sku: `WB-${marker.toUpperCase()}`,
    status: "published",
    readiness_passed: true,
    published_at: new Date().toISOString(),
    width_mm: 1800,
    length_mm: 2700,
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
  if (created.error) throw created.error;
  const related = await Promise.all([
    service.from("product_translations").insert(
      (["en", "de", "ka", "ru"] as const).map((locale) => ({
        product_id: productId,
        locale,
        slug,
        name:
          locale === "de"
            ? "Internationaler Testteppich"
            : locale === "ka"
              ? "საერთაშორისო სატესტო ხალიჩა"
              : locale === "ru"
                ? "Международный тестовый ковёр"
                : "International Test Rug",
        short_description: "Synthetic worldwide browser fixture.",
        long_description: "Synthetic worldwide browser fixture only.",
        search_text: `world browser ${marker}`,
        alt_text_ready: true,
        status: "published" as const,
      })),
    ),
    service.from("product_prices").insert([
      {
        product_id: productId,
        currency: "GEL",
        amount_minor: 100_000,
        enabled: true,
      },
      {
        product_id: productId,
        currency: "EUR",
        amount_minor: 35_000,
        enabled: true,
      },
      {
        product_id: productId,
        currency: "USD",
        amount_minor: 40_000,
        enabled: true,
      },
    ]),
    service.from("inventory_items").insert({
      product_id: productId,
      stock_model: "stocked",
      on_hand_quantity: 10,
    }),
  ]);
  for (const result of related) if (result.error) throw result.error;

  await page.goto(`/en/products/${slug}`);
  await page.getByLabel("Currency").selectOption("EUR");
  await expect(page.getByText("€350.00")).toBeVisible();
  await page.getByRole("link", { name: "Deutsch", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/de/products/${slug}$`));
  await expect(
    page.getByRole("heading", { name: "Internationaler Testteppich" }),
  ).toBeVisible();
  await expect(page.getByText("350,00 €")).toBeVisible();
  await page.getByRole("link", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("link", { name: "Cart (1)" }).click();

  await page.getByLabel("Discount code").fill("NOT-A-REAL-CODE");
  await page
    .locator("#main-content")
    .getByRole("button", { name: "Apply" })
    .click();
  await expect(page.getByText("That discount is unavailable.")).toBeVisible();

  await page.getByLabel("Delivery country").selectOption("GE");
  await page.getByLabel("Delivery method").selectOption("standard-test");
  await page.getByRole("button", { name: "Review exact total" }).click();
  await expect(page).toHaveURL(/\/en\/checkout\?session=/);
  await expect(
    page.getByRole("heading", { name: "Tax and customs disclosure" }),
  ).toBeVisible();
  await expect(page.getByText(/awaiting approval/i)).toBeVisible();

  await page.getByRole("link", { name: "Back to cart" }).click();
  await page.getByLabel("Delivery country").selectOption("US");
  await page
    .getByLabel("Delivery method")
    .selectOption("manual-worldwide-test");
  await page.getByRole("button", { name: "Review exact total" }).click();
  await expect(page).toHaveURL(/\/en\/quote\?country=US$/);
  await expect(
    page.getByText(/does not promise service, timing, customs treatment/i),
  ).toBeVisible();
  const quoteForm = page.locator("form.checkout-form");
  await quoteForm.getByLabel("Email").fill(`world-${marker}@epoca.test`);
  await quoteForm.getByLabel("Full name").fill("Worldwide Browser Buyer");
  await quoteForm.getByLabel("Address line 1").fill("1 International Avenue");
  await quoteForm.getByLabel("City").fill("New York");
  await quoteForm.getByLabel("Two-letter country code").fill("US");
  await quoteForm
    .getByLabel("What should staff know? (optional)")
    .fill("Please price this route without assumptions.");
  await quoteForm.getByRole("button", { name: "Request quote" }).click();
  await expect(
    page.getByRole("heading", { name: "Quote request received" }),
  ).toBeVisible();
  const referenceText = await page.getByText(/Quote reference:/).innerText();
  const reference = referenceText.split(":").at(-1)?.trim();
  expect(reference).toMatch(/^QUO-[A-Z0-9]{12}$/);
  await page.getByRole("link", { name: "View private status" }).click();
  await expect(
    page.getByRole("heading", { name: "Status: Submitted" }),
  ).toBeVisible();

  if (!reference) throw new Error("QUOTE_REFERENCE_NOT_RENDERED");
  const quoteRecord = await service
    .from("manual_quote_requests")
    .select("id")
    .eq("reference", reference)
    .single();
  if (quoteRecord.error) throw quoteRecord.error;
  await page.context().clearCookies();
  await page.goto(`/en/admin/quotes/${quoteRecord.data.id}`);
  await page.getByLabel("Email").fill(manager.email);
  await page.getByLabel("Password").fill(manager.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/en/admin/quotes/${quoteRecord.data.id}$`),
  );
  await page.getByLabel("Delivery amount in minor units").fill("25000");
  await page.getByLabel("Delivery method · KA").fill("საერთაშორისო");
  await page.getByLabel("Delivery method · EN").fill("International tracked");
  await page.getByLabel("Delivery method · DE").fill("International verfolgt");
  await page.getByLabel("Delivery method · RU").fill("Международная");
  await page.getByLabel("Minimum days").fill("10");
  await page.getByLabel("Maximum days").fill("18");
  await page
    .getByLabel("Buyer-visible message", { exact: true })
    .last()
    .fill("Your route has been priced for review.");
  await page.getByRole("button", { name: "Send quote" }).click();
  await expect(page.getByText("Ready", { exact: true })).toBeVisible();

  await page.goto("/en/admin/settings/currencies");
  await expect(
    page.getByRole("heading", { name: "Currencies and explicit prices" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "EUR" })).toBeVisible();
  await page.goto("/en/admin/settings/delivery");
  await expect(
    page.getByRole("heading", {
      name: "Delivery zones, methods, and rates",
    }),
  ).toBeVisible();
});
