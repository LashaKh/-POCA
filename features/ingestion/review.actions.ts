"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { z } from "zod";

import { managerCommandClient } from "@/features/auth/admin-command";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import {
  commandFailure,
  commandSuccess,
  type CommandResult,
} from "@/lib/validation/command-result";
import { getErrorMessage } from "@/lib/validation/error";

import { getAssistanceProvider } from "./suggestions";

const localeSchema = z.enum(["ka", "en", "de", "ru"]);
const reviewSchema = z.object({
  locale: localeSchema,
  batchId: z.uuid(),
  productVersion: z.coerce.number().int().positive(),
  widthMm: z.coerce.number().int().min(1).max(100_000),
  lengthMm: z.coerce.number().int().min(1).max(100_000),
  shape: z.string().trim().min(2).max(60),
  materials: z.string().trim().min(1).max(500),
  construction: z.string().trim().min(2).max(120),
  colors: z.string().trim().min(1).max(500),
  styles: z.string().trim().max(500).default(""),
  condition: z.string().trim().min(2).max(120),
  careCode: z.string().trim().min(2).max(80),
  deliveryClass: z.string().trim().min(2).max(80),
  category: z.string().trim().min(2).max(80),
  origin: z.string().trim().max(120).default(""),
  originVerified: z.string().optional(),
  price: z.string().regex(/^\d{1,13}(?:\.\d{1,2})?$/),
  onHandQuantity: z.coerce.number().int().min(0).max(1_000_000),
});

const translationSchema = z.object({
  locale: localeSchema,
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(160),
  name: z.string().trim().min(1).max(180),
  short_description: z.string().trim().min(1).max(500),
  long_description: z.string().trim().min(1).max(10_000),
  care_text: z.string().trim().max(3_000),
  seo_title: z.string().trim().max(70),
  seo_description: z.string().trim().max(180),
});

const mediaReviewSchema = z.object({
  locale: localeSchema,
  batchId: z.uuid(),
  fileId: z.uuid(),
  assetVersion: z.coerce.number().int().positive(),
  altText: z.string().trim().min(3).max(500),
  focalX: z.coerce.number().min(0).max(1),
  focalY: z.coerce.number().min(0).max(1),
  ownershipBasis: z.enum(["owned", "licensed", "generated"]),
  creatorSource: z.string().trim().min(2).max(300),
});

const publicationSchema = z.object({
  locale: localeSchema,
  productId: z.uuid(),
  productVersion: z.coerce.number().int().positive(),
  confirmation: z.literal("publish"),
});

export type ReviewActionState = CommandResult<{ saved: true }> | undefined;

function splitTerms(value: string) {
  return [
    ...new Set(
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ];
}

function priceToMinor(value: string) {
  const [whole, fraction = ""] = value.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount < 0)
    throw new RangeError("INVALID_PRICE");
  return amount;
}

async function managerClient() {
  return managerCommandClient("ingestion.review.command");
}

function failure(correlationId: string, error: unknown): ReviewActionState {
  const message = getErrorMessage(error, "INTERNAL_ERROR");
  const conflict = message.includes("VERSION_CONFLICT");
  return commandFailure(
    {
      code: conflict ? "VERSION_CONFLICT" : "INVALID_INPUT",
      messageKey: conflict
        ? "admin.review.versionConflict"
        : "admin.review.saveFailed",
      retryable: conflict,
    },
    correlationId,
  );
}

export async function saveProductReviewAction(
  _previous: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const correlationId = randomUUID();
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(correlationId, "INVALID_INPUT");
  const translations = ["ka", "en", "de", "ru"].map((locale) =>
    translationSchema.safeParse({
      locale,
      slug: formData.get(`${locale}.slug`),
      name: formData.get(`${locale}.name`),
      short_description: formData.get(`${locale}.shortDescription`),
      long_description: formData.get(`${locale}.longDescription`),
      care_text: formData.get(`${locale}.careText`) ?? "",
      seo_title: formData.get(`${locale}.seoTitle`) ?? "",
      seo_description: formData.get(`${locale}.seoDescription`) ?? "",
    }),
  );
  if (translations.some((translation) => !translation.success)) {
    return failure(correlationId, "TRANSLATION_INCOMPLETE");
  }
  try {
    const client = await managerClient();
    const { error } = await client.rpc("save_ingestion_product_review", {
      p_batch_id: parsed.data.batchId,
      p_expected_version: parsed.data.productVersion,
      p_facts: {
        widthMm: parsed.data.widthMm,
        lengthMm: parsed.data.lengthMm,
        shape: parsed.data.shape,
        materials: splitTerms(parsed.data.materials),
        construction: parsed.data.construction,
        colors: splitTerms(parsed.data.colors),
        styles: splitTerms(parsed.data.styles),
        condition: parsed.data.condition,
        careCode: parsed.data.careCode,
        deliveryClass: parsed.data.deliveryClass,
        category: parsed.data.category,
        origin: parsed.data.origin,
        originVerified: parsed.data.originVerified === "true",
      },
      p_translations: translations.map((translation) =>
        translation.success ? translation.data : {},
      ),
      p_currency: "GEL",
      p_amount_minor: priceToMinor(parsed.data.price),
      p_on_hand_quantity: parsed.data.onHandQuantity,
    });
    if (error) throw error;
    revalidatePath(
      `/${parsed.data.locale}/admin/ingestion/${parsed.data.batchId}/review`,
    );
    return commandSuccess({ saved: true }, correlationId);
  } catch (error) {
    return failure(correlationId, error);
  }
}

export async function approveMediaAction(
  _previous: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const correlationId = randomUUID();
  const parsed = mediaReviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(correlationId, "INVALID_INPUT");
  try {
    const client = await managerClient();
    const { error } = await client.rpc("approve_ingestion_media", {
      p_file_id: parsed.data.fileId,
      p_expected_asset_version: parsed.data.assetVersion,
      p_alt_text: parsed.data.altText,
      p_focal_x: parsed.data.focalX,
      p_focal_y: parsed.data.focalY,
      p_ownership_basis: parsed.data.ownershipBasis,
      p_creator_source: parsed.data.creatorSource,
    });
    if (error) throw error;
    revalidatePath(
      `/${parsed.data.locale}/admin/ingestion/${parsed.data.batchId}/review`,
    );
    return commandSuccess({ saved: true }, correlationId);
  } catch (error) {
    return failure(correlationId, error);
  }
}

export async function publishProductAction(formData: FormData) {
  const parsed = publicationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const client = await managerClient();
  const { data, error } = await client.rpc("publish_product", {
    p_product_id: parsed.data.productId,
    p_expected_version: parsed.data.productVersion,
    p_confirm: true,
  });
  if (error) throw error;
  const { data: translation } = await client
    .from("product_translations")
    .select("slug")
    .eq("product_id", data.id)
    .eq("locale", parsed.data.locale)
    .single();
  redirect(`/${parsed.data.locale}/products/${translation?.slug ?? ""}`);
}

export async function requestSuggestionAction(formData: FormData) {
  const schema = z.object({
    locale: localeSchema,
    batchId: z.uuid(),
    fileId: z.uuid(),
    privacyApproved: z.literal("true"),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await managerClient();
  const service = createServiceSupabaseClient();
  const [
    { data: file, error: fileError },
    { data: config, error: configError },
  ] = await Promise.all([
    service
      .from("ingestion_files")
      .select("id,batch_id,storage_bucket,storage_path,media_asset_id")
      .eq("id", parsed.data.fileId)
      .single(),
    service
      .from("integration_configs")
      .select("mode,capabilities,secret_configured")
      .eq("key", "catalog-assistance")
      .maybeSingle(),
  ]);
  if (fileError) throw fileError;
  if (configError) throw configError;
  if (
    !config ||
    !["sandbox", "live"].includes(config.mode) ||
    !config.secret_configured ||
    !config.capabilities.includes("selected-product-images")
  ) {
    return;
  }
  const { data: batch, error: batchError } = await service
    .from("ingestion_batches")
    .select("product_id")
    .eq("id", file.batch_id)
    .single();
  if (batchError || !batch.product_id)
    throw batchError ?? new Error("INGESTION_PRODUCT_NOT_FOUND");
  const { data: product, error: productError } = await service
    .from("products")
    .select("sku")
    .eq("id", batch.product_id)
    .single();
  if (productError) throw productError;
  const { data: blob, error: downloadError } = await service.storage
    .from(file.storage_bucket)
    .download(file.storage_path);
  if (downloadError) throw downloadError;
  const stripped = await sharp(Buffer.from(await blob.arrayBuffer()), {
    limitInputPixels: 80_000_000,
  })
    .rotate()
    .resize({
      width: 1024,
      height: 1024,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 82 })
    .toBuffer();
  const provider = getAssistanceProvider();
  const result = await provider.suggestCatalogDraft({
    imageDataUrl: `data:image/jpeg;base64,${stripped.toString("base64")}`,
    verifiedContext: {
      sku: product.sku,
      supportedLocales: ["ka", "en", "de", "ru"],
    },
  });
  const { error: suggestionError } = await service
    .from("assisted_suggestions")
    .insert({
      batch_id: file.batch_id,
      product_id: batch.product_id,
      ingestion_file_id: file.id,
      suggestion_kind: "catalog-copy",
      provider_key: result.providerKey,
      model_key: result.modelKey,
      schema_version: result.schemaVersion,
      payload: result.suggestion,
    });
  if (suggestionError) throw suggestionError;
  revalidatePath(
    `/${parsed.data.locale}/admin/ingestion/${parsed.data.batchId}/review`,
  );
}

export async function decideSuggestionAction(formData: FormData) {
  const schema = z.object({
    locale: localeSchema,
    batchId: z.uuid(),
    suggestionId: z.uuid(),
    decision: z.enum(["accepted", "edited", "rejected"]),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const client = await managerClient();
  const { data: user } = await client.auth.getUser();
  if (!user.user) return;
  const { error } = await client
    .from("assisted_suggestions")
    .update({
      status: parsed.data.decision,
      decided_by: user.user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.suggestionId)
    .eq("status", "pending");
  if (error) throw error;
  revalidatePath(
    `/${parsed.data.locale}/admin/ingestion/${parsed.data.batchId}/review`,
  );
}
