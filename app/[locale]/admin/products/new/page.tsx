import { getTranslations, setRequestLocale } from "next-intl/server";

import { CatalogProductForm } from "@/components/admin/catalog/product-form/product-form";
import type { CatalogProductFormValue } from "@/components/admin/catalog/product-form/types";
import { getAdminProductDetail } from "@/features/catalog/admin-queries";
import { getCatalogAdminLabels } from "@/features/catalog/admin-copy";
import { Link } from "@/i18n/navigation";
import { isAppLocale, locales } from "@/i18n/routing";

export default async function NewCatalogProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ duplicate?: string | string[] }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);
  const query = await searchParams;
  const duplicateId =
    typeof query.duplicate === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      query.duplicate,
    )
      ? query.duplicate
      : undefined;
  const [t, duplicate] = await Promise.all([
    getTranslations({ locale, namespace: "admin.catalog" }),
    duplicateId ? getAdminProductDetail(duplicateId) : undefined,
  ]);
  const labels = getCatalogAdminLabels(locale);
  const duplicatePrice = duplicate?.prices.find(
    (price) => price.currency === "GEL" && price.market_code === null,
  );
  const initial: CatalogProductFormValue = duplicate
    ? {
        sku: "",
        widthMm: duplicate.product.width_mm,
        lengthMm: duplicate.product.length_mm,
        diameterMm: duplicate.product.diameter_mm,
        shape: duplicate.product.shape ?? "rectangle",
        materials: duplicate.product.materials,
        construction: duplicate.product.construction ?? "",
        colors: duplicate.product.colors,
        styles: duplicate.product.styles,
        condition: duplicate.product.condition ?? "",
        careCode: duplicate.product.care_code ?? "professional-clean",
        deliveryClass: duplicate.product.delivery_class ?? "parcel",
        category: duplicate.product.category ?? "carpet",
        origin: duplicate.product.origin ?? "",
        originVerified: duplicate.product.origin_verified,
        ageMinYear: duplicate.product.age_min_year,
        ageMaxYear: duplicate.product.age_max_year,
        ageVerified: duplicate.product.age_verified,
        pile: duplicate.product.pile ?? "",
        pileVerified: duplicate.product.pile_verified,
        handmade: duplicate.product.handmade,
        handmadeVerified: duplicate.product.handmade_verified,
        provenanceSummary: duplicate.product.provenance_summary ?? "",
        provenanceVerified: duplicate.product.provenance_verified,
        gelPrice: ((duplicatePrice?.amount_minor ?? 0) / 100).toFixed(2),
        stockModel: duplicate.inventory?.stock_model ?? "unique",
        onHandQuantity: duplicate.inventory?.on_hand_quantity ?? 1,
        translations: locales.map((translationLocale) => {
          const translation = duplicate.translations.find(
            (item) => item.locale === translationLocale,
          );
          return {
            locale: translationLocale,
            slug: "",
            name: translation?.name ?? "",
            shortDescription: translation?.short_description ?? "",
            longDescription: translation?.long_description ?? "",
            careText: translation?.care_text ?? "",
            searchText: translation?.search_text ?? "",
            seoTitle: translation?.seo_title ?? "",
            seoDescription: translation?.seo_description ?? "",
            altTextReady: false,
            status: "draft",
          };
        }),
      }
    : {
        sku: "",
        widthMm: null,
        lengthMm: null,
        diameterMm: null,
        shape: "rectangle",
        materials: [],
        construction: "",
        colors: [],
        styles: [],
        condition: "",
        careCode: "professional-clean",
        deliveryClass: "parcel",
        category: "carpet",
        origin: "",
        originVerified: false,
        ageMinYear: null,
        ageMaxYear: null,
        ageVerified: false,
        pile: "",
        pileVerified: false,
        handmade: null,
        handmadeVerified: false,
        provenanceSummary: "",
        provenanceVerified: false,
        gelPrice: "0.00",
        stockModel: "unique",
        onHandQuantity: 1,
        translations: locales.map((translationLocale) => ({
          locale: translationLocale,
          slug: "",
          name: "",
          shortDescription: "",
          longDescription: "",
          careText: "",
          searchText: "",
          seoTitle: "",
          seoDescription: "",
          altTextReady: false,
          status: "draft",
        })),
      };
  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <Link href="/admin/products" locale={locale}>
          {labels.backProducts}
        </Link>
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("newTitle")}</h1>
        <p>{t("newIntro")}</p>
      </header>
      {duplicate ? (
        <p className="warning-message">{labels.duplicateNotice}</p>
      ) : null}
      <CatalogProductForm locale={locale} initial={initial} labels={labels} />
    </main>
  );
}
