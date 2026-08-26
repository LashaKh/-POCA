import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { MediaReview } from "@/components/admin/ingestion/media-review";
import { ProductReviewForm } from "@/components/admin/ingestion/product-review-form";
import { ReadinessPanel } from "@/components/admin/ingestion/readiness-panel";
import { getProductReadiness } from "@/features/catalog/readiness";
import {
  decideSuggestionAction,
  publishProductAction,
} from "@/features/ingestion/review.actions";
import { Link } from "@/i18n/navigation";
import { isAppLocale, type AppLocale } from "@/i18n/routing";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

const locales: AppLocale[] = ["ka", "en", "de", "ru"];

export default async function IngestionReviewPage({
  params,
}: {
  params: Promise<{ locale: string; batchId: string }>;
}) {
  const { locale, batchId } = await params;
  if (!isAppLocale(locale)) return null;
  const t = await getTranslations({ locale, namespace: "admin.review" });
  const client = await createServerSupabaseClient();
  const { data: batch, error: batchError } = await client
    .from("ingestion_batches")
    .select("id,title,product_id,status")
    .eq("id", batchId)
    .maybeSingle();
  if (batchError) throw batchError;
  if (!batch?.product_id) notFound();
  const [
    { data: product, error: productError },
    { data: translations, error: translationError },
    { data: price, error: priceError },
    { data: inventory, error: inventoryError },
    { data: files, error: filesError },
    { data: suggestions, error: suggestionError },
    { data: assistance, error: assistanceError },
    readiness,
  ] = await Promise.all([
    client.from("products").select("*").eq("id", batch.product_id).single(),
    client
      .from("product_translations")
      .select("*")
      .eq("product_id", batch.product_id),
    client
      .from("product_prices")
      .select("amount_minor")
      .eq("product_id", batch.product_id)
      .eq("currency", "GEL")
      .eq("enabled", true)
      .maybeSingle(),
    client
      .from("inventory_items")
      .select("on_hand_quantity")
      .eq("product_id", batch.product_id)
      .maybeSingle(),
    client
      .from("ingestion_files")
      .select("id,original_filename,status,media_asset_id")
      .eq("batch_id", batchId)
      .in("status", ["ready", "duplicate"])
      .order("created_at"),
    client
      .from("assisted_suggestions")
      .select("id,status,payload,provider_key,model_key,created_at")
      .eq("batch_id", batchId)
      .order("created_at", { ascending: false }),
    client
      .from("integration_configs")
      .select("mode,capabilities,secret_configured")
      .eq("key", "catalog-assistance")
      .maybeSingle(),
    getProductReadiness(batch.product_id),
  ]);
  for (const error of [
    productError,
    translationError,
    priceError,
    inventoryError,
    filesError,
    suggestionError,
    assistanceError,
  ]) {
    if (error) throw error;
  }
  if (!product) notFound();
  if (!translations || !files || !suggestions) {
    throw new Error("INCOMPLETE_REVIEW_QUERY");
  }

  const service = createServiceSupabaseClient();
  const assetIds = files
    .map((file) => file.media_asset_id)
    .filter((id): id is string => Boolean(id));
  const [
    { data: assets, error: assetsError },
    { data: variants, error: variantsError },
  ] = await Promise.all([
    assetIds.length
      ? service
          .from("media_assets")
          .select("id,version,approval_status")
          .in("id", assetIds)
      : Promise.resolve({ data: [], error: null }),
    assetIds.length
      ? service
          .from("media_variants")
          .select("asset_id,path,status")
          .in("asset_id", assetIds)
          .eq("role", "card_4x5")
          .eq("format", "webp")
          .order("width")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (assetsError) throw assetsError;
  if (variantsError) throw variantsError;
  const mediaItems = await Promise.all(
    files.flatMap((file) => {
      if (!file.media_asset_id) return [];
      const asset = assets.find((item) => item.id === file.media_asset_id);
      const variant = variants.find(
        (item) => item.asset_id === file.media_asset_id,
      );
      if (!asset || !variant) return [];
      return [
        service.storage
          .from("product-renditions")
          .createSignedUrl(variant.path, 600)
          .then(({ data, error }) => {
            if (error) throw error;
            return {
              fileId: file.id,
              filename: file.original_filename,
              assetVersion: asset.version,
              previewUrl: data.signedUrl,
              approved: asset.approval_status === "approved",
            };
          }),
      ];
    }),
  );
  const assistanceEnabled = Boolean(
    assistance &&
    ["sandbox", "live"].includes(assistance.mode) &&
    assistance.secret_configured &&
    assistance.capabilities.includes("selected-product-images"),
  );
  const translationValues = locales.map((itemLocale) => {
    const existing = translations.find(
      (translation) => translation.locale === itemLocale,
    );
    const baseSlug = product.sku
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return {
      locale: itemLocale,
      slug: existing?.slug ?? `${baseSlug}-${itemLocale}`,
      name: existing?.name ?? "",
      shortDescription: existing?.short_description ?? "",
      longDescription: existing?.long_description ?? "",
      careText: existing?.care_text ?? "",
      seoTitle: existing?.seo_title ?? "",
      seoDescription: existing?.seo_description ?? "",
    };
  });
  const labelKeys = [
    "facts",
    "width",
    "length",
    "shape",
    "materials",
    "construction",
    "colors",
    "styles",
    "condition",
    "careCode",
    "deliveryClass",
    "category",
    "origin",
    "originVerified",
    "price",
    "quantity",
    "translations",
    "translationHelp",
    "slug",
    "name",
    "shortDescription",
    "longDescription",
    "careText",
    "seoTitle",
    "seoDescription",
    "save",
    "saved",
    "saveFailed",
    "language.ka",
    "language.en",
    "language.de",
    "language.ru",
  ] as const;
  const formLabels = Object.fromEntries(labelKeys.map((key) => [key, t(key)]));
  const mediaKeys = [
    "focalX",
    "focalY",
    "cropPreview",
    "altText",
    "ownership",
    "owned",
    "licensed",
    "generated",
    "creatorSource",
    "approved",
    "approveMedia",
    "saved",
    "saveFailed",
    "requestSuggestion",
    "assistanceDisabled",
  ] as const;
  const mediaLabels = Object.fromEntries(mediaKeys.map((key) => [key, t(key)]));

  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <Link href={`/admin/ingestion/${batchId}`} locale={locale}>
          ← {t("back")}
        </Link>
        <p className="eyebrow">
          {t("eyebrow")} · {product.sku}
        </p>
        <h1>{t("title", { batch: batch.title })}</h1>
        <p>{t("intro")}</p>
      </header>
      <section className="admin-panel" aria-labelledby="product-review-heading">
        <h2 id="product-review-heading">{t("productRecord")}</h2>
        <ProductReviewForm
          locale={locale}
          batchId={batchId}
          product={{
            version: product.version,
            widthMm: product.width_mm,
            lengthMm: product.length_mm,
            shape: product.shape,
            materials: product.materials,
            construction: product.construction,
            colors: product.colors,
            styles: product.styles,
            condition: product.condition,
            careCode: product.care_code,
            deliveryClass: product.delivery_class,
            category: product.category,
            origin: product.origin,
            originVerified: product.origin_verified,
            price: price ? (price.amount_minor / 100).toFixed(2) : "0.00",
            quantity: inventory?.on_hand_quantity ?? 1,
          }}
          translations={translationValues}
          labels={formLabels}
        />
      </section>
      <section className="admin-panel" aria-labelledby="media-review-heading">
        <h2 id="media-review-heading">{t("media")}</h2>
        <p>{t("mediaHelp")}</p>
        {mediaItems.length === 0 ? (
          <p>{t("mediaWaiting")}</p>
        ) : (
          <div className="media-review-grid">
            {mediaItems.map((item) => (
              <MediaReview
                key={item.fileId}
                item={item}
                locale={locale}
                batchId={batchId}
                assistanceEnabled={assistanceEnabled}
                labels={mediaLabels}
              />
            ))}
          </div>
        )}
      </section>
      <section className="admin-panel" aria-labelledby="suggestions-heading">
        <h2 id="suggestions-heading">{t("suggestions")}</h2>
        <p>
          {assistanceEnabled ? t("suggestionsHelp") : t("assistanceDisabled")}
        </p>
        {suggestions.map((suggestion) => (
          <article className="suggestion-card" key={suggestion.id}>
            <p>
              <strong>{suggestion.provider_key}</strong> ·{" "}
              {suggestion.model_key} · {suggestion.status}
            </p>
            <pre>{JSON.stringify(suggestion.payload, null, 2)}</pre>
            {suggestion.status === "pending" ? (
              <form action={decideSuggestionAction} className="button-row">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="batchId" value={batchId} />
                <input
                  type="hidden"
                  name="suggestionId"
                  value={suggestion.id}
                />
                <button
                  className="text-button"
                  name="decision"
                  value="accepted"
                  type="submit"
                >
                  {t("acceptSuggestion")}
                </button>
                <button
                  className="text-button"
                  name="decision"
                  value="edited"
                  type="submit"
                >
                  {t("markEdited")}
                </button>
                <button
                  className="text-button"
                  name="decision"
                  value="rejected"
                  type="submit"
                >
                  {t("rejectSuggestion")}
                </button>
              </form>
            ) : null}
          </article>
        ))}
      </section>
      <ReadinessPanel
        readiness={readiness}
        labels={{
          title: t("readiness"),
          ready: t("ready"),
          blocked: t("blocked"),
          confirm: t("confirm"),
          publish: t("publish"),
          DIMENSIONS_REQUIRED: t("blocker.DIMENSIONS_REQUIRED"),
          CATALOG_FACTS_REQUIRED: t("blocker.CATALOG_FACTS_REQUIRED"),
          FOUR_LOCALES_REQUIRED: t("blocker.FOUR_LOCALES_REQUIRED"),
          ACTIVE_PRICE_REQUIRED: t("blocker.ACTIVE_PRICE_REQUIRED"),
          INVENTORY_REQUIRED: t("blocker.INVENTORY_REQUIRED"),
          APPROVED_LICENSED_PRIMARY_REQUIRED: t(
            "blocker.APPROVED_LICENSED_PRIMARY_REQUIRED",
          ),
          APPROVED_RENDITIONS_REQUIRED: t(
            "blocker.APPROVED_RENDITIONS_REQUIRED",
          ),
          MEDIA_REVIEW_REQUIRED: t("blocker.MEDIA_REVIEW_REQUIRED"),
          SUGGESTIONS_REQUIRE_DECISION: t(
            "blocker.SUGGESTIONS_REQUIRE_DECISION",
          ),
        }}
      />
      {readiness.ready ? (
        <form className="publication-form" action={publishProductAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="productId" value={product.id} />
          <input
            type="hidden"
            name="productVersion"
            value={readiness.productVersion}
          />
          <label className="checkbox-field">
            <input
              type="checkbox"
              name="confirmation"
              value="publish"
              required
            />
            <span>{t("confirm")}</span>
          </label>
          <button className="button" type="submit">
            {t("publish")}
          </button>
        </form>
      ) : null}
    </main>
  );
}
