import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceSupabaseClient: vi.fn(),
}));

import {
  bulkCatalogActionSchema,
  catalogProductCommandSchema,
  copiedTranslationWarnings,
  decimalToMinor,
  scheduleCatalogProductSchema,
  splitCatalogTerms,
  translationCompleteness,
} from "@/features/catalog/admin-schema";
import { buildCatalogExportCsv } from "@/features/catalog/exporter";
import {
  buildImportErrorCsv,
  previewCatalogCsv,
  spreadsheetSafeCell,
  standardCatalogHeaders,
} from "@/features/catalog/importer";

const productId = "80000000-0000-4000-8000-000000000001";

function csvRow(overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    sku: "EPOCA-UNIT-001",
    name_ka: "ქართული ხალიჩა",
    slug_ka: "unit-ka",
    name_en: "Unit carpet",
    slug_en: "unit-en",
    name_de: "Testteppich",
    slug_de: "unit-de",
    name_ru: "Тестовый ковёр",
    slug_ru: "unit-ru",
    price_gel: "1250.50",
    on_hand: "1",
    stock_model: "unique",
    width_mm: "1700",
    length_mm: "2400",
    materials: "wool",
    colors: "blue, ivory",
    ...overrides,
  };
  return standardCatalogHeaders
    .map((header) => `"${(values[header] ?? "").replaceAll('"', '""')}"`)
    .join(",");
}

describe("catalog administration domain", () => {
  it("normalizes money and repeatable comma-separated facts without floats", () => {
    expect(decimalToMinor("1250.50")).toBe(125050);
    expect(() => decimalToMinor("12.345")).toThrow("INVALID_MONEY");
    expect(splitCatalogTerms("wool, silk, wool,  ")).toEqual(["wool", "silk"]);
  });

  it("reports locale completeness and suspicious copied names", () => {
    expect(
      translationCompleteness([
        { locale: "ka", name: "A" },
        { locale: "en", name: "B" },
        { locale: "de", name: "C" },
      ]),
    ).toEqual({ complete: false, missing: ["ru"] });
    expect(
      copiedTranslationWarnings([
        { locale: "ka", name: "Same" },
        { locale: "en", name: "same" },
        { locale: "de", name: "Anders" },
        { locale: "ru", name: "Другой" },
      ]),
    ).toEqual([["ka", "en"]]);
  });

  it("requires a collection for collection-wide bulk actions", () => {
    const base = {
      locale: "en",
      productIds: [productId],
      action: "collection_add",
      reason: "Seasonal merchandising",
      idempotencyKey: "catalog-bulk-unit-0001",
    };
    expect(bulkCatalogActionSchema.safeParse(base).success).toBe(false);
    expect(
      bulkCatalogActionSchema.safeParse({
        ...base,
        collectionId: "80000000-0000-4000-8000-000000000002",
      }).success,
    ).toBe(true);
    expect(
      bulkCatalogActionSchema.safeParse({
        ...base,
        action: "unpublish",
      }).success,
    ).toBe(true);
  });

  it("validates a Georgia-local product publication schedule", () => {
    expect(
      scheduleCatalogProductSchema.safeParse({
        locale: "en",
        productId,
        expectedVersion: 2,
        scheduledAt: "2026-09-10T11:30",
        reason: "Launch the autumn collection",
      }).success,
    ).toBe(true);
    expect(
      scheduleCatalogProductSchema.safeParse({
        locale: "en",
        productId,
        expectedVersion: 2,
        scheduledAt: "not-a-date",
        reason: "Launch",
      }).success,
    ).toBe(false);
  });

  it("rejects a stale or malformed edit token before a database command", () => {
    const parsed = catalogProductCommandSchema.safeParse({
      productId,
      expectedVersion: 0,
      sku: "UNIT",
      facts: { materials: [], colors: [], styles: [] },
      translations: [],
      prices: [],
      stockModel: "unique",
      onHandQuantity: 1,
      changeNote: "Edit",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("catalog CSV safety", () => {
  it("previews a standard multilingual row without mutating the catalog", async () => {
    const csv = `${standardCatalogHeaders.join(",")}\r\n${csvRow()}`;
    const preview = await previewCatalogCsv(csv);
    expect(preview.validCount).toBe(1);
    expect(preview.invalidCount).toBe(0);
    expect(preview.rows[0].normalized?.prices[0].amountMinor).toBe(125050);
    expect(preview.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it("retains mixed-validity rows and builds a formula-safe error report", async () => {
    const csv = `${standardCatalogHeaders.join(",")}\n${csvRow()}\n${csvRow({ sku: "=SUM(A1:A2)", price_gel: "bad" })}`;
    const preview = await previewCatalogCsv(csv);
    expect(preview.validCount).toBe(1);
    expect(preview.invalidCount).toBe(1);
    const report = buildImportErrorCsv(preview.rows);
    expect(report).toContain("INVALID_SKU");
    expect(report).toContain("'=SUM(A1:A2)");
  });

  it("neutralizes spreadsheet formulas in all exported text cells", () => {
    expect(spreadsheetSafeCell("=1+1")).toBe("'=1+1");
    const csv = buildCatalogExportCsv([
      {
        id: productId,
        sku: "=1+1",
        status: "draft",
        name: "+cmd",
        locale: "en",
        slug: "formula-safe",
        currency: "GEL",
        amount_minor: 100,
        stock_model: "unique",
        on_hand_quantity: 1,
        reserved_quantity: 0,
        updated_at: "2026-08-25T00:00:00Z",
      },
    ]);
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("'+cmd");
  });
});
