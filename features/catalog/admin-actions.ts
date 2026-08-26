"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { managerCommandClient } from "@/features/auth/admin-command";
import { locales, type AppLocale, isAppLocale } from "@/i18n/routing";
import {
  commandFailure,
  commandSuccess,
  type CommandResult,
} from "@/lib/validation/command-result";

import {
  bulkCatalogActionSchema,
  catalogProductCommandSchema,
  collectionCommandSchema,
  decimalToMinor,
  inventoryAdjustmentSchema,
  reorderCollectionSchema,
  savedCatalogViewSchema,
  scheduleCatalogProductSchema,
  splitCatalogTerms,
} from "./admin-schema";
import { processCatalogExports } from "./exporter";
import { buildImportErrorCsv, previewCatalogCsv } from "./importer";

export type CatalogActionState =
  | CommandResult<{ id: string; version?: number; summary?: unknown }>
  | undefined;

async function managerClient() {
  return managerCommandClient("catalog.admin.command");
}

function failure(
  correlationId: string,
  error?: { code?: string; message?: string },
) {
  const conflict =
    error?.code === "40001" || error?.message?.includes("VERSION_CONFLICT");
  return commandFailure(
    {
      code: conflict ? "VERSION_CONFLICT" : "INVALID_INPUT",
      messageKey: conflict
        ? "admin.catalog.versionConflict"
        : "admin.catalog.failed",
      retryable: conflict ?? false,
    },
    correlationId,
  );
}

function localeFrom(formData: FormData): AppLocale {
  const locale = formData.get("locale");
  return isAppLocale(locale) ? locale : "en";
}

function optionalNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? Number(text) : undefined;
}

function georgiaLocalToIso(value: string | undefined) {
  if (!value) return undefined;
  const normalized = value.length === 16 ? `${value}:00` : value;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return undefined;
  }
  const date = new Date(`${normalized}+04:00`);
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
}

function revalidateCatalogStorefront(
  productSlugs: string[] = [],
  collectionSlugs: string[] = [],
) {
  for (const locale of locales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/search`);
    for (const slug of productSlugs) {
      revalidatePath(`/${locale}/products/${slug}`);
    }
    for (const slug of collectionSlugs) {
      revalidatePath(`/${locale}/collections/${slug}`);
    }
  }
}

function productCandidate(formData: FormData) {
  const translations = locales.map((translationLocale) => ({
    locale: translationLocale,
    slug: String(formData.get(`${translationLocale}.slug`) ?? ""),
    name: String(formData.get(`${translationLocale}.name`) ?? ""),
    shortDescription: String(
      formData.get(`${translationLocale}.shortDescription`) ?? "",
    ),
    longDescription: String(
      formData.get(`${translationLocale}.longDescription`) ?? "",
    ),
    careText: String(formData.get(`${translationLocale}.careText`) ?? ""),
    searchText: String(formData.get(`${translationLocale}.searchText`) ?? ""),
    seoTitle: String(formData.get(`${translationLocale}.seoTitle`) ?? ""),
    seoDescription: String(
      formData.get(`${translationLocale}.seoDescription`) ?? "",
    ),
    altTextReady: formData.get(`${translationLocale}.altTextReady`) === "true",
    status: String(formData.get(`${translationLocale}.status`) ?? "draft"),
  }));
  return catalogProductCommandSchema.safeParse({
    productId: String(formData.get("productId") ?? "") || undefined,
    expectedVersion: optionalNumber(formData.get("expectedVersion")),
    sku: formData.get("sku"),
    facts: {
      widthMm: optionalNumber(formData.get("widthMm")),
      lengthMm: optionalNumber(formData.get("lengthMm")),
      diameterMm: optionalNumber(formData.get("diameterMm")),
      shape: formData.get("shape") ?? "",
      materials: splitCatalogTerms(String(formData.get("materials") ?? "")),
      construction: formData.get("construction") ?? "",
      colors: splitCatalogTerms(String(formData.get("colors") ?? "")),
      styles: splitCatalogTerms(String(formData.get("styles") ?? "")),
      condition: formData.get("condition") ?? "",
      careCode: formData.get("careCode") ?? "",
      deliveryClass: formData.get("deliveryClass") ?? "",
      category: formData.get("category") ?? "",
      origin: formData.get("origin") ?? "",
      originVerified: formData.get("originVerified") === "true",
      ageMinYear: optionalNumber(formData.get("ageMinYear")),
      ageMaxYear: optionalNumber(formData.get("ageMaxYear")),
      ageVerified: formData.get("ageVerified") === "true",
      pile: formData.get("pile") ?? "",
      pileVerified: formData.get("pileVerified") === "true",
      handmade:
        formData.get("handmade") === "true"
          ? true
          : formData.get("handmade") === "false"
            ? false
            : null,
      handmadeVerified: formData.get("handmadeVerified") === "true",
      provenanceSummary: formData.get("provenanceSummary") ?? "",
      provenanceVerified: formData.get("provenanceVerified") === "true",
    },
    translations,
    prices: [
      {
        currency: "GEL",
        amountMinor: decimalToMinor(String(formData.get("gelPrice") ?? "")),
        enabled: true,
      },
    ],
    stockModel: formData.get("stockModel"),
    onHandQuantity: optionalNumber(formData.get("onHandQuantity")),
    changeNote: formData.get("changeNote"),
  });
}

export async function saveCatalogProductAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const correlationId = randomUUID();
  let parsed: ReturnType<typeof productCandidate>;
  try {
    parsed = productCandidate(formData);
  } catch {
    return failure(correlationId);
  }
  if (!parsed.success) return failure(correlationId);
  try {
    const client = await managerClient();
    const result = await client.rpc("save_catalog_product", {
      p_product_id: parsed.data.productId,
      p_expected_version: parsed.data.expectedVersion,
      p_sku: parsed.data.sku,
      p_facts: parsed.data.facts,
      p_translations: parsed.data.translations,
      p_prices: parsed.data.prices,
      p_stock_model: parsed.data.stockModel,
      p_on_hand_quantity: parsed.data.onHandQuantity,
      p_change_note: parsed.data.changeNote,
    });
    if (result.error) return failure(correlationId, result.error);
    const locale = localeFrom(formData);
    revalidatePath(`/${locale}/admin/products`);
    revalidatePath(`/${locale}/admin/products/${result.data.id}/edit`);
    revalidateCatalogStorefront(
      parsed.data.translations.map((translation) => translation.slug),
    );
    return commandSuccess(
      { id: result.data.id, version: result.data.version },
      correlationId,
    );
  } catch {
    return failure(correlationId);
  }
}

export async function adjustInventoryAction(formData: FormData) {
  const parsed = inventoryAdjustmentSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return failure(randomUUID());
  const client = await managerClient();
  const translations = await client
    .from("product_translations")
    .select("slug")
    .eq("product_id", parsed.data.productId);
  if (translations.error) return failure(randomUUID(), translations.error);
  const result = await client.rpc("adjust_catalog_inventory", {
    p_product_id: parsed.data.productId,
    p_expected_inventory_version: parsed.data.expectedInventoryVersion,
    p_quantity_delta: parsed.data.quantityDelta,
    p_reason: parsed.data.reason,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  if (result.error) return failure(randomUUID(), result.error);
  revalidatePath(`/${parsed.data.locale}/admin/products`);
  revalidatePath(
    `/${parsed.data.locale}/admin/products/${parsed.data.productId}/edit`,
  );
  revalidateCatalogStorefront(
    (translations.data ?? []).map((translation) => translation.slug),
  );
  return commandSuccess(
    { id: result.data.id, version: result.data.version },
    randomUUID(),
  );
}

export async function bulkCatalogAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const candidate = {
    ...Object.fromEntries(formData),
    productIds: String(formData.get("productIds") ?? "")
      .split(",")
      .filter(Boolean),
    collectionId: String(formData.get("collectionId") ?? "") || undefined,
  };
  const parsed = bulkCatalogActionSchema.safeParse(candidate);
  if (!parsed.success) return failure(randomUUID());
  const client = await managerClient();
  const translations = await client
    .from("product_translations")
    .select("slug")
    .in("product_id", parsed.data.productIds);
  if (translations.error) return failure(randomUUID(), translations.error);
  const result = await client.rpc("bulk_catalog_action", {
    p_product_ids: parsed.data.productIds,
    p_action: parsed.data.action,
    p_collection_id: parsed.data.collectionId,
    p_reason: parsed.data.reason,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  if (result.error) return failure(randomUUID(), result.error);
  revalidatePath(`/${parsed.data.locale}/admin/products`);
  revalidateCatalogStorefront(
    (translations.data ?? []).map((translation) => translation.slug),
  );
  return commandSuccess(
    { id: parsed.data.idempotencyKey, summary: result.data },
    randomUUID(),
  );
}

export async function scheduleCatalogProductAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const correlationId = randomUUID();
  const parsed = scheduleCatalogProductSchema.safeParse({
    ...Object.fromEntries(formData),
    scheduledAt: formData.get("scheduledAt"),
  });
  if (!parsed.success) return failure(correlationId);
  const scheduledAt = georgiaLocalToIso(parsed.data.scheduledAt);
  if (!scheduledAt) return failure(correlationId);
  try {
    const client = await managerClient();
    const result = await client.rpc("schedule_catalog_product", {
      p_product_id: parsed.data.productId,
      p_expected_version: parsed.data.expectedVersion,
      p_scheduled_at: scheduledAt,
      p_reason: parsed.data.reason,
    });
    if (result.error) return failure(correlationId, result.error);
    revalidatePath(`/${parsed.data.locale}/admin/products`);
    revalidatePath(
      `/${parsed.data.locale}/admin/products/${parsed.data.productId}/edit`,
    );
    const translations = await client
      .from("product_translations")
      .select("slug")
      .eq("product_id", parsed.data.productId);
    if (!translations.error) {
      revalidateCatalogStorefront(
        (translations.data ?? []).map((translation) => translation.slug),
      );
    }
    return commandSuccess(
      { id: result.data.id, version: result.data.version },
      correlationId,
    );
  } catch {
    return failure(correlationId);
  }
}

function collectionCandidate(formData: FormData) {
  return collectionCommandSchema.safeParse({
    locale: localeFrom(formData),
    collectionId: String(formData.get("collectionId") ?? "") || undefined,
    expectedVersion: optionalNumber(formData.get("expectedVersion")),
    code: formData.get("code"),
    status: formData.get("status"),
    orderStrategy: formData.get("orderStrategy"),
    scheduledAt: formData.get("scheduledAt"),
    translations: locales.map((translationLocale) => ({
      locale: translationLocale,
      slug: String(formData.get(`${translationLocale}.slug`) ?? ""),
      name: String(formData.get(`${translationLocale}.name`) ?? ""),
      description: String(
        formData.get(`${translationLocale}.description`) ?? "",
      ),
      seoTitle: String(formData.get(`${translationLocale}.seoTitle`) ?? ""),
      seoDescription: String(
        formData.get(`${translationLocale}.seoDescription`) ?? "",
      ),
      status: String(formData.get(`${translationLocale}.status`) ?? "draft"),
    })),
    note: formData.get("note"),
  });
}

export async function saveCollectionAction(formData: FormData) {
  const parsed = collectionCandidate(formData);
  if (!parsed.success) return failure(randomUUID());
  const client = await managerClient();
  const result = await client.rpc("save_catalog_collection", {
    p_collection_id: parsed.data.collectionId,
    p_expected_version: parsed.data.expectedVersion,
    p_code: parsed.data.code,
    p_status: parsed.data.status,
    p_order_strategy: parsed.data.orderStrategy,
    p_translations: parsed.data.translations,
    p_note: parsed.data.note,
    p_scheduled_at: georgiaLocalToIso(parsed.data.scheduledAt),
  });
  if (result.error) return failure(randomUUID(), result.error);
  revalidatePath(`/${parsed.data.locale}/admin/collections`);
  revalidateCatalogStorefront(
    [],
    parsed.data.translations.map((translation) => translation.slug),
  );
  return commandSuccess(
    { id: result.data.id, version: result.data.version },
    randomUUID(),
  );
}

export async function reorderCollectionAction(formData: FormData) {
  const parsed = reorderCollectionSchema.safeParse({
    ...Object.fromEntries(formData),
    productIds: String(formData.get("productIds") ?? "")
      .split(",")
      .filter(Boolean),
    featuredProductId:
      String(formData.get("featuredProductId") ?? "") || undefined,
  });
  if (!parsed.success) return failure(randomUUID());
  const client = await managerClient();
  const translations = await client
    .from("collection_translations")
    .select("slug")
    .eq("collection_id", parsed.data.collectionId);
  if (translations.error) return failure(randomUUID(), translations.error);
  const result = await client.rpc("reorder_catalog_collection", {
    p_collection_id: parsed.data.collectionId,
    p_ordered_product_ids: parsed.data.productIds,
    p_featured_product_id: parsed.data.featuredProductId,
    p_expected_version: parsed.data.expectedVersion,
  });
  if (result.error) return failure(randomUUID(), result.error);
  revalidatePath(
    `/${parsed.data.locale}/admin/collections/${parsed.data.collectionId}`,
  );
  revalidateCatalogStorefront(
    [],
    (translations.data ?? []).map((translation) => translation.slug),
  );
  return commandSuccess(
    { id: result.data.id, version: result.data.version },
    randomUUID(),
  );
}

export async function stageCatalogImportAction(formData: FormData) {
  const locale = localeFrom(formData);
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) {
    return failure(randomUUID());
  }
  try {
    const client = await managerClient();
    const preview = await previewCatalogCsv(
      file.stream() as ReadableStream<Uint8Array>,
    );
    const user = await client.auth.getUser();
    if (!user.data.user) return failure(randomUUID());
    const uploadId = randomUUID();
    const path = `staff/${user.data.user.id}/${uploadId}.csv`;
    const reportPath =
      preview.invalidCount > 0
        ? `staff/${user.data.user.id}/${uploadId}-errors.csv`
        : undefined;
    const upload = await client.storage
      .from("catalog-imports")
      .upload(path, file, {
        contentType: "text/csv",
        upsert: false,
      });
    if (upload.error) return failure(randomUUID(), upload.error);
    if (reportPath) {
      const reportUpload = await client.storage
        .from("catalog-imports")
        .upload(reportPath, buildImportErrorCsv(preview.rows), {
          contentType: "text/csv",
          upsert: false,
        });
      if (reportUpload.error) return failure(randomUUID(), reportUpload.error);
    }
    const result = await client.rpc("stage_catalog_import", {
      p_source_path: path,
      p_source_checksum: preview.checksum,
      p_original_filename: file.name,
      p_header_mapping: Object.fromEntries(
        preview.headers.map((header) => [header, header]),
      ),
      p_rows: preview.rows,
      p_error_report_path: reportPath,
    });
    if (result.error) return failure(randomUUID(), result.error);
    revalidatePath(`/${locale}/admin/imports/catalog`);
    return commandSuccess(
      { id: result.data.id, summary: preview },
      randomUUID(),
    );
  } catch {
    return failure(randomUUID());
  }
}

export async function applyCatalogImportAction(formData: FormData) {
  const batchId = String(formData.get("batchId") ?? "");
  const locale = localeFrom(formData);
  const client = await managerClient();
  const result = await client.rpc("apply_catalog_import", {
    p_batch_id: batchId,
  });
  if (result.error) return failure(randomUUID(), result.error);
  revalidatePath(`/${locale}/admin/imports/catalog`);
  revalidatePath(`/${locale}/admin/products`);
  revalidateCatalogStorefront();
  return commandSuccess(
    { id: result.data.id, version: result.data.version },
    randomUUID(),
  );
}

export async function cancelCatalogImportAction(formData: FormData) {
  const batchId = String(formData.get("batchId") ?? "");
  const locale = localeFrom(formData);
  const client = await managerClient();
  const result = await client.rpc("cancel_catalog_import", {
    p_batch_id: batchId,
  });
  if (result.error) return failure(randomUUID(), result.error);
  revalidatePath(`/${locale}/admin/imports/catalog`);
  return commandSuccess(
    { id: result.data.id, version: result.data.version },
    randomUUID(),
  );
}

export async function requestCatalogExportAction(formData: FormData) {
  const locale = localeFrom(formData);
  const status = String(formData.get("status") ?? "all");
  const client = await managerClient();
  const result = await client.rpc("request_catalog_export", {
    p_scope: { status },
    p_download_name: `epoca-catalog-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  if (result.error) return failure(randomUUID(), result.error);
  if (process.env.DEPLOY_ENV === "local") await processCatalogExports(1);
  revalidatePath(`/${locale}/admin/products`);
  return commandSuccess({ id: result.data.id }, randomUUID());
}

export async function saveCatalogAdminViewAction(formData: FormData) {
  const parsed = savedCatalogViewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(randomUUID());
  const client = await managerClient();
  const result = await client.rpc("save_catalog_admin_view", {
    p_view_type: "products",
    p_name: parsed.data.name,
    p_filters: {
      query: parsed.data.query,
      status: parsed.data.status,
      translation: parsed.data.translation,
      stock: parsed.data.stock,
    },
    p_sort: { value: parsed.data.sort },
  });
  if (result.error) return failure(randomUUID(), result.error);
  revalidatePath(`/${parsed.data.locale}/admin/products`);
  return commandSuccess({ id: result.data.id }, randomUUID());
}

export async function adjustInventoryFormAction(
  formData: FormData,
): Promise<void> {
  await adjustInventoryAction(formData);
}

export async function saveCollectionFormAction(
  formData: FormData,
): Promise<void> {
  await saveCollectionAction(formData);
}

export async function reorderCollectionFormAction(
  formData: FormData,
): Promise<void> {
  await reorderCollectionAction(formData);
}

export async function stageCatalogImportFormAction(
  formData: FormData,
): Promise<void> {
  await stageCatalogImportAction(formData);
}

export async function applyCatalogImportFormAction(
  formData: FormData,
): Promise<void> {
  await applyCatalogImportAction(formData);
}

export async function cancelCatalogImportFormAction(
  formData: FormData,
): Promise<void> {
  await cancelCatalogImportAction(formData);
}

export async function requestCatalogExportFormAction(
  formData: FormData,
): Promise<void> {
  await requestCatalogExportAction(formData);
}

export async function saveCatalogAdminViewFormAction(
  formData: FormData,
): Promise<void> {
  await saveCatalogAdminViewAction(formData);
}
