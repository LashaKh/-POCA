import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { InventoryPanel } from "@/components/admin/catalog/inventory-panel";
import { CatalogProductForm } from "@/components/admin/catalog/product-form/product-form";
import type { CatalogProductFormValue } from "@/components/admin/catalog/product-form/types";
import { SchedulePanel } from "@/components/admin/catalog/schedule-panel";
import { getAdminProductDetail } from "@/features/catalog/admin-queries";
import { getCatalogAdminLabels } from "@/features/catalog/admin-copy";
import { Link } from "@/i18n/navigation";
import { isAppLocale, locales } from "@/i18n/routing";

export const dynamic = "force-dynamic";

function georgiaLocalValue(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tbilisi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date(value))
    .replace(" ", "T");
}

export default async function EditCatalogProductPage({
  params,
}: {
  params: Promise<{ locale: string; productId: string }>;
}) {
  const { locale, productId } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);
  const [t, detail] = await Promise.all([
    getTranslations({ locale, namespace: "admin.catalog" }),
    getAdminProductDetail(productId),
  ]);
  if (!detail) notFound();
  const labels = getCatalogAdminLabels(locale);
  const gelPrice = detail.prices.find(
    (price) => price.currency === "GEL" && price.market_code === null,
  );
  const initial: CatalogProductFormValue = {
    id: detail.product.id,
    version: detail.product.version,
    sku: detail.product.sku,
    widthMm: detail.product.width_mm,
    lengthMm: detail.product.length_mm,
    diameterMm: detail.product.diameter_mm,
    shape: detail.product.shape ?? "rectangle",
    materials: detail.product.materials,
    construction: detail.product.construction ?? "",
    colors: detail.product.colors,
    styles: detail.product.styles,
    condition: detail.product.condition ?? "",
    careCode: detail.product.care_code ?? "",
    deliveryClass: detail.product.delivery_class ?? "parcel",
    category: detail.product.category ?? "carpet",
    origin: detail.product.origin ?? "",
    originVerified: detail.product.origin_verified,
    ageMinYear: detail.product.age_min_year,
    ageMaxYear: detail.product.age_max_year,
    ageVerified: detail.product.age_verified,
    pile: detail.product.pile ?? "",
    pileVerified: detail.product.pile_verified,
    handmade: detail.product.handmade,
    handmadeVerified: detail.product.handmade_verified,
    provenanceSummary: detail.product.provenance_summary ?? "",
    provenanceVerified: detail.product.provenance_verified,
    gelPrice: ((gelPrice?.amount_minor ?? 0) / 100).toFixed(2),
    stockModel: detail.inventory?.stock_model ?? "unique",
    onHandQuantity: detail.inventory?.on_hand_quantity ?? 0,
    translations: locales.map((translationLocale) => {
      const translation = detail.translations.find(
        (item) => item.locale === translationLocale,
      );
      return {
        locale: translationLocale,
        slug: translation?.slug ?? "",
        name: translation?.name ?? "",
        shortDescription: translation?.short_description ?? "",
        longDescription: translation?.long_description ?? "",
        careText: translation?.care_text ?? "",
        searchText: translation?.search_text ?? "",
        seoTitle: translation?.seo_title ?? "",
        seoDescription: translation?.seo_description ?? "",
        altTextReady: translation?.alt_text_ready ?? false,
        status: translation?.status ?? "draft",
      };
    }),
  };

  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header split-page-header">
        <div>
          <Link href="/admin/products" locale={locale}>
            {labels.backProducts}
          </Link>
          <p className="eyebrow">{detail.product.sku}</p>
          <h1>{t("editTitle")}</h1>
          <p>{t("editIntro")}</p>
        </div>
        <div className="button-row">
          <Link
            className="button button-secondary"
            href={`/admin/products/${productId}/preview`}
            locale={locale}
          >
            {labels.preview}
          </Link>
          <Link
            className="button button-secondary"
            href={{
              pathname: "/admin/products/new",
              query: { duplicate: productId },
            }}
            locale={locale}
          >
            {labels.duplicateAsNew}
          </Link>
          <Link
            className="button button-secondary"
            href={`/admin/products/${productId}/history`}
            locale={locale}
          >
            {labels.viewHistory}
          </Link>
        </div>
      </header>
      {detail.product.status === "archived" ? (
        <p className="warning-message">{labels.archivedNotice}</p>
      ) : null}
      <CatalogProductForm locale={locale} initial={initial} labels={labels} />
      {detail.inventory ? (
        <InventoryPanel
          locale={locale}
          productId={productId}
          inventory={{
            version: detail.inventory.version,
            stockModel: detail.inventory.stock_model,
            onHand: detail.inventory.on_hand_quantity,
            reserved: detail.inventory.reserved_quantity,
            available: detail.inventory.available_quantity ?? 0,
          }}
          labels={labels}
        />
      ) : null}
      {detail.product.status !== "archived" ? (
        <SchedulePanel
          locale={locale}
          productId={productId}
          version={detail.product.version}
          defaultScheduledAt={georgiaLocalValue(detail.product.scheduled_at)}
          labels={labels}
        />
      ) : null}
    </main>
  );
}
