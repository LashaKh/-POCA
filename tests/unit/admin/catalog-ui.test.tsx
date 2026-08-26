import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/catalog/admin-actions", () => ({
  saveCatalogProductAction: vi.fn(async () => undefined),
  bulkCatalogAction: vi.fn(async () => undefined),
  adjustInventoryFormAction: vi.fn(async () => undefined),
  stageCatalogImportFormAction: vi.fn(async () => undefined),
  applyCatalogImportFormAction: vi.fn(async () => undefined),
  cancelCatalogImportFormAction: vi.fn(async () => undefined),
  scheduleCatalogProductAction: vi.fn(async () => undefined),
}));
vi.mock("@/features/collections/admin-actions", () => ({
  saveCollectionFormAction: vi.fn(async () => undefined),
  reorderCollectionFormAction: vi.fn(async () => undefined),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
  }: {
    href: string | object;
    children: ReactNode;
  }) => <a href={typeof href === "string" ? href : "#"}>{children}</a>,
}));

import { CollectionEditor } from "@/components/admin/catalog/collection-editor";
import { ImportWorkspace } from "@/components/admin/catalog/import-workspace";
import { InventoryPanel } from "@/components/admin/catalog/inventory-panel";
import { CatalogProductForm } from "@/components/admin/catalog/product-form/product-form";
import type { CatalogProductFormValue } from "@/components/admin/catalog/product-form/types";
import { ProductTable } from "@/components/admin/catalog/product-table";
import { SchedulePanel } from "@/components/admin/catalog/schedule-panel";
import { TranslationWorkspace } from "@/components/admin/catalog/translation-workspace";
import {
  getCatalogAdminLabels,
  getCatalogStatusLabel,
} from "@/features/catalog/admin-copy";

const labels = getCatalogAdminLabels("en");
const productId = "80000000-0000-4000-8000-000000000001";
const translations: CatalogProductFormValue["translations"] = [
  "ka",
  "en",
  "de",
  "ru",
].map((locale) => ({
  locale: locale as "ka" | "en" | "de" | "ru",
  slug: `unit-${locale}`,
  name: locale === "ka" ? "ქართული" : `Unit ${locale}`,
  shortDescription: "Short",
  longDescription: "Long",
  careText: "Care",
  searchText: "Unit",
  seoTitle: "Unit",
  seoDescription: "Unit carpet",
  altTextReady: true,
  status: "reviewed",
}));

describe("catalog administration UI", () => {
  it("localizes catalog filters and publication statuses in every non-English locale", () => {
    for (const locale of ["ka", "de", "ru"] as const) {
      const localized = getCatalogAdminLabels(locale);
      expect(localized.sort).not.toBe("Sort");
      expect(localized.recentFirst).not.toBe("Recently updated first");
      expect(localized.lowStock).not.toBe("Low stock");
      expect(getCatalogStatusLabel(localized, "draft")).not.toBe("draft");
      expect(getCatalogStatusLabel(localized, "published")).not.toBe(
        "published",
      );
    }
  });

  it("shows live four-locale completeness and copied-text warnings", () => {
    render(
      <TranslationWorkspace
        labels={labels}
        initialTranslations={translations.map((translation) => ({
          ...translation,
          name: "Same catalog name",
        }))}
      />,
    );
    expect(screen.getByText("4 of 4 languages complete")).toBeInTheDocument();
    expect(screen.getByText(/possible copied translations/i)).toHaveTextContent(
      "ka / en / de / ru",
    );
    fireEvent.change(
      screen.getByLabelText("Name", { selector: "input[name='ru.name']" }),
      {
        target: { value: "Другое имя" },
      },
    );
    expect(
      screen.getByText(/possible copied translations/i),
    ).not.toHaveTextContent("ru");
  });

  it("renders a shared edit form with optimistic version and audited inventory guidance", () => {
    const initial: CatalogProductFormValue = {
      id: productId,
      version: 7,
      sku: "UNIT-001",
      widthMm: 1700,
      lengthMm: 2400,
      diameterMm: null,
      shape: "rectangle",
      materials: ["wool"],
      construction: "hand-knotted",
      colors: ["blue"],
      styles: ["traditional"],
      condition: "excellent",
      careCode: "professional-clean",
      deliveryClass: "parcel",
      category: "carpet",
      origin: "Georgia",
      originVerified: true,
      gelPrice: "1250.00",
      stockModel: "unique",
      onHandQuantity: 1,
      translations,
    };
    const { container } = render(
      <CatalogProductForm locale="en" initial={initial} labels={labels} />,
    );
    expect(screen.getByLabelText("SKU")).toHaveValue("UNIT-001");
    expect(
      container.querySelector("input[name='expectedVersion']"),
    ).toHaveValue("7");
    expect(
      screen.getByText(/version conflict stops the save/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/audited inventory adjustment panel/i),
    ).toBeInTheDocument();
  });

  it("requires a reason and exposes on-hand, reserved, and available stock", () => {
    render(
      <InventoryPanel
        locale="en"
        productId={productId}
        inventory={{
          version: 3,
          stockModel: "unique",
          onHand: 1,
          reserved: 1,
          available: 0,
        }}
        labels={labels}
      />,
    );
    expect(screen.getByText("On hand").nextElementSibling).toHaveTextContent(
      "1",
    );
    expect(screen.getByText("Reserved").nextElementSibling).toHaveTextContent(
      "1",
    );
    expect(screen.getByLabelText("Reason")).toBeRequired();
    expect(
      screen.getByText(/Reserved stock cannot be removed/i),
    ).toBeInTheDocument();
  });

  it("selects dense table rows and enables reversible bulk controls", () => {
    render(
      <ProductTable
        locale="en"
        initialBulkKey="catalog-bulk-component-0001"
        collections={[]}
        labels={labels}
        rows={[
          {
            id: productId,
            sku: "UNIT-001",
            displayName: "Unit carpet",
            status: "draft",
            version: 1,
            gelAmountMinor: 125000,
            onHand: 1,
            reserved: 0,
            available: 1,
            missingLocales: ["ru"],
            updatedAt: "2026-08-25T10:00:00Z",
          },
        ]}
      />,
    );
    const confirm = screen.getByRole("button", { name: "Confirm action" });
    expect(confirm).toBeDisabled();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Unit carpet" }),
    );
    expect(confirm).toBeEnabled();
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Archive" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Restore" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Unpublish" }),
    ).toBeInTheDocument();
  });

  it("labels product scheduling as Georgia time and requires a reason", () => {
    render(
      <SchedulePanel
        locale="en"
        productId={productId}
        version={4}
        defaultScheduledAt="2026-09-10T11:30"
        labels={labels}
      />,
    );
    expect(screen.getByText(/Georgia time \(UTC\+4\)/)).toBeInTheDocument();
    expect(screen.getByLabelText("Schedule publication time")).toHaveValue(
      "2026-09-10T11:30",
    );
    expect(screen.getByLabelText("Reason for scheduling")).toBeRequired();
  });

  it("shows mixed import preview outcomes before apply and supports cancellation", () => {
    render(
      <ImportWorkspace
        locale="en"
        labels={labels}
        batches={[
          {
            id: "80000000-0000-4000-8000-000000000010",
            status: "ready",
            originalFilename: "mixed.csv",
            rowCount: 2,
            validCount: 1,
            invalidCount: 1,
            appliedCount: 0,
            errorReportPath: "staff/user/errors.csv",
            createdAt: "2026-08-25T10:00:00Z",
            rows: [
              { rowNumber: 2, status: "valid", errors: [], errorCode: null },
              {
                rowNumber: 3,
                status: "invalid",
                errors: [{ field: "sku" }],
                errorCode: null,
              },
            ],
          },
        ]}
      />,
    );
    expect(
      screen.getByText(/2 rows · 1 valid · 1 invalid/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Apply valid rows" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel import" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Download error report" }),
    ).toBeInTheDocument();
  });

  it("moves collection members and preserves one featured choice", () => {
    render(
      <CollectionEditor
        locale="en"
        labels={labels}
        collection={{
          id: "80000000-0000-4000-8000-000000000020",
          version: 1,
          code: "unit-collection",
          status: "draft",
          orderStrategy: "manual",
          scheduledAt: null,
          translations: translations.map((translation) => ({
            locale: translation.locale,
            slug: translation.slug,
            name: translation.name,
            description: translation.longDescription,
            seoTitle: translation.seoTitle,
            seoDescription: translation.seoDescription,
            status: translation.status,
          })),
          members: [
            { productId, sku: "ONE", name: "First", featured: true },
            {
              productId: "80000000-0000-4000-8000-000000000002",
              sku: "TWO",
              name: "Second",
              featured: false,
            },
          ],
        }}
      />,
    );
    const list = screen.getByRole("list");
    fireEvent.click(screen.getByRole("button", { name: "Move Second up" }));
    expect(within(list).getAllByRole("listitem")[0]).toHaveTextContent(
      "Second",
    );
    fireEvent.click(
      screen.getByLabelText("Featured", { selector: "input[value$='0002']" }),
    );
    expect(
      screen.getByLabelText("Featured", { selector: "input[value$='0002']" }),
    ).toBeChecked();
  });
});
