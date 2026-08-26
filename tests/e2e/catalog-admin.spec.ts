import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import type { Database } from "@/lib/supabase/database.types";
import {
  createManager,
  localEnvironment,
} from "@/tests/support/order-operations";

test("manager maintains products, stock, translations, collections, imports, archives, and exports", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  test.skip(
    testInfo.project.name !== "tablet-768-en",
    "One project owns the stateful catalog-administration journey.",
  );
  const local = localEnvironment();
  const service = createClient<Database>(
    local.API_URL,
    local.SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const manager = await createManager(service, "Catalog");
  const marker = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
  const sku = `E2E-${marker.toUpperCase()}`;
  const collectionCode = `e2e-${marker}`;
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "epoca-catalog-"));
  const csvName = `${marker}-catalog-mixed.csv`;
  const csvPath = join(temporaryDirectory, csvName);
  const importedSku = `CSV-${marker.toUpperCase()}`;
  const headers = [
    "sku",
    "name_ka",
    "slug_ka",
    "name_en",
    "slug_en",
    "name_de",
    "slug_de",
    "name_ru",
    "slug_ru",
    "price_gel",
    "on_hand",
    "stock_model",
    "width_mm",
    "length_mm",
    "materials",
    "colors",
  ];
  const validRow = [
    importedSku,
    "CSV ქართული",
    `csv-${marker}-ka`,
    "CSV English",
    `csv-${marker}-en`,
    "CSV Deutsch",
    `csv-${marker}-de`,
    "CSV Русский",
    `csv-${marker}-ru`,
    "975.00",
    "1",
    "unique",
    "1600",
    "2300",
    "wool",
    "indigo",
  ];
  const invalidRow = [...validRow];
  invalidRow[0] = "=INVALID";
  await writeFile(
    csvPath,
    [headers, validRow, invalidRow]
      .map((row) =>
        row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
      )
      .join("\r\n"),
    "utf8",
  );
  let productId: string | undefined;
  let collectionId: string | undefined;

  try {
    await page.goto("/en/admin/products/new");
    await expect(page).toHaveURL(/\/en\/auth\/sign-in/);
    await page.getByLabel("Email").fill(manager.email);
    await page.getByLabel("Password").fill(manager.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/en\/admin\/products\/new$/);

    await page.getByLabel("SKU").fill(sku);
    await page.getByLabel("Width (mm)").fill("1700");
    await page.getByLabel("Length (mm)").fill("2400");
    await page.getByLabel("Materials (comma separated)").fill("wool");
    await page.getByLabel("Colors (comma separated)").fill("indigo, ivory");
    await page.getByLabel("Construction").fill("hand-knotted");
    await page.getByLabel("Condition").fill("excellent");
    await page.getByLabel("Price (GEL)").fill("2450.00");
    await page.getByLabel("Stock model").selectOption("stocked");
    for (const locale of ["ka", "en", "de", "ru"] as const) {
      const detail = page.locator(`details:has(input[name="${locale}.name"])`);
      if ((await detail.getAttribute("open")) === null)
        await detail.locator("summary").click();
      await page
        .locator(`input[name="${locale}.slug"]`)
        .fill(`${collectionCode}-${locale}`);
      await page
        .locator(`input[name="${locale}.name"]`)
        .fill(`Collector ${locale.toUpperCase()} ${marker}`);
      await page
        .locator(`textarea[name="${locale}.shortDescription"]`)
        .fill("Human reviewed short description.");
      await page
        .locator(`textarea[name="${locale}.longDescription"]`)
        .fill("Human reviewed full catalog description.");
    }
    await page.getByRole("button", { name: "Save product" }).click();
    await expect(page.getByText("Catalog record saved.")).toBeVisible();
    await page
      .getByRole("link", { name: "Continue in the saved product" })
      .click();
    await expect(page).toHaveURL(/\/en\/admin\/products\/[a-f0-9-]+\/edit$/);
    productId = page.url().split("/").at(-2);
    if (!productId)
      throw new Error("Catalog product id missing from edit route");

    await page
      .getByRole("link", { name: "Duplicate as a new product" })
      .click();
    await expect(page.getByText(/Facts and copy were copied/)).toBeVisible();
    await expect(page.getByLabel("SKU")).toHaveValue("");
    await expect(page.locator("input[name='en.name']")).toHaveValue(
      `Collector EN ${marker}`,
    );
    await expect(page.locator("input[name='en.slug']")).toHaveValue("");
    await page.goto(`/en/admin/products/${productId}/edit`);

    const externalEdit = await service.rpc("save_catalog_product", {
      p_sku: sku,
      p_facts: {
        widthMm: 1700,
        lengthMm: 2400,
        shape: "rectangle",
        materials: ["wool"],
        construction: "hand-knotted",
        colors: ["indigo", "ivory"],
        styles: [],
        condition: "excellent",
        careCode: "professional-clean",
        deliveryClass: "parcel",
        category: "carpet",
        origin: "",
        originVerified: false,
      },
      p_translations: [
        {
          locale: "en",
          slug: `${collectionCode}-en`,
          name: `Collector EN ${marker}`,
          status: "draft",
        },
      ],
      p_prices: [{ currency: "GEL", amountMinor: 245000, enabled: true }],
      p_stock_model: "stocked",
      p_on_hand_quantity: 1,
      p_change_note: "Simulate concurrent manager edit",
      p_product_id: productId,
      p_expected_version: 1,
    });
    expect(externalEdit.error).toBeNull();
    await page.getByLabel("Condition").fill("museum quality");
    await expect(
      page.getByText(/Another manager changed this product/),
    ).toBeVisible();
    await page.reload();

    const schedule = new Date(Date.now() + 48 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16);
    await page.getByLabel("Schedule publication time").fill(schedule);
    await page
      .getByLabel("Reason for scheduling")
      .fill("E2E launch readiness check");
    await page.getByRole("button", { name: "Schedule product" }).click();
    await expect(
      page.getByText("The change could not be completed safely."),
    ).toBeVisible();

    await page.getByLabel(/Quantity change/).fill("2");
    await page
      .getByLabel("Reason", { exact: true })
      .fill("E2E inventory count");
    await page.getByRole("button", { name: "Record stock adjustment" }).click();
    await expect(page.getByText("3", { exact: true }).first()).toBeVisible();

    await page.goto("/en/admin/collections");
    await page.getByLabel("Collection code").fill(collectionCode);
    for (const locale of ["ka", "en", "de", "ru"] as const) {
      await page
        .locator(`input[name="${locale}.name"]`)
        .fill(`Collection ${locale.toUpperCase()} ${marker}`);
      await page
        .locator(`input[name="${locale}.slug"]`)
        .fill(`${collectionCode}-${locale}`);
    }
    await page.getByRole("button", { name: "Create collection" }).click();
    await expect(page.getByText(`Collection EN ${marker}`)).toBeVisible();
    const collectionLink = page
      .getByRole("link", { name: "Edit collection" })
      .first();
    collectionId = (await collectionLink.getAttribute("href"))
      ?.split("/")
      .at(-1);
    expect(collectionId).toBeTruthy();

    await page.goto(`/en/admin/products?query=${encodeURIComponent(sku)}`);
    await page.getByLabel("View name").fill(`E2E ${marker}`);
    await page.getByRole("button", { name: "Save current view" }).click();
    await expect(
      page.getByRole("link", { name: `E2E ${marker}` }),
    ).toBeVisible();
    await page.goto(
      `/en/admin/products?query=${encodeURIComponent(sku)}&translation=complete`,
    );
    await expect(page.getByText(sku)).toBeVisible();
    await page
      .getByRole("checkbox", {
        name: new RegExp(`Select Collector EN ${marker}`),
      })
      .check();
    await page
      .getByRole("combobox", { name: "Action", exact: true })
      .selectOption("collection_add");
    await page
      .getByRole("combobox", { name: "Collection", exact: true })
      .selectOption(collectionId!);
    await page
      .getByLabel("Reason", { exact: true })
      .fill("Feature in E2E collection");
    await page.getByRole("button", { name: "Confirm action" }).click();
    await expect(
      page.getByText("1 succeeded · 0 need attention"),
    ).toBeVisible();

    await page.goto(`/en/admin/collections/${collectionId}`);
    await expect(page.getByText(`Collector EN ${marker}`)).toBeVisible();
    await expect(page.getByRole("radio", { name: "Featured" })).toBeVisible();

    await page.goto(`/en/admin/products?query=${encodeURIComponent(sku)}`);
    await page
      .getByRole("checkbox", {
        name: new RegExp(`Select Collector EN ${marker}`),
      })
      .check();
    await page
      .getByRole("combobox", { name: "Action", exact: true })
      .selectOption("archive");
    await page
      .getByLabel("Reason", { exact: true })
      .fill("E2E reversible archive");
    await page.getByRole("button", { name: "Confirm action" }).click();
    await expect(
      page.getByText("1 succeeded · 0 need attention"),
    ).toBeVisible();
    await page
      .getByRole("combobox", { name: "Action", exact: true })
      .selectOption("restore");
    await page
      .getByLabel("Reason", { exact: true })
      .fill("E2E archive recovery");
    await page.getByRole("button", { name: "Confirm action" }).click();
    await expect
      .poll(async () => {
        const result = await service
          .from("products")
          .select("status")
          .eq("id", productId!)
          .single();
        return result.data?.status;
      })
      .toBe("draft");

    await page.goto("/en/admin/imports/catalog");
    await page.getByLabel("Standard ÉPOCA CSV").setInputFiles(csvPath);
    await page.getByRole("button", { name: "Upload and validate" }).click();
    const importBatch = page
      .locator("article.import-batch")
      .filter({ hasText: csvName });
    await expect(
      importBatch.getByText(/2 rows · 1 valid · 1 invalid/),
    ).toBeVisible();
    await expect(
      importBatch.getByRole("link", { name: "Download error report" }),
    ).toBeVisible();
    await importBatch.getByRole("button", { name: "Apply valid rows" }).click();
    await expect(
      importBatch.getByText(/2 rows · 1 valid · 1 invalid · 1 applied/),
    ).toBeVisible();

    await page.goto(
      `/en/admin/products?query=${encodeURIComponent(importedSku)}`,
    );
    await expect(page.getByText(importedSku)).toBeVisible();
    await page
      .getByRole("button", { name: "Request current scoped export" })
      .click();
    await expect(
      page.getByText("complete", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Download" }).first(),
    ).toBeVisible();

    await page.goto(`/en/admin/products/${productId}/history`);
    await expect(page.getByText("inventory", { exact: true })).toBeVisible();
    await expect(page.getByText("archived", { exact: true })).toBeVisible();
    await expect(page.getByText("restored", { exact: true })).toBeVisible();
  } finally {
    if (collectionId)
      await service.from("collections").delete().eq("id", collectionId);
    await service.auth.admin.deleteUser(manager.userId);
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
