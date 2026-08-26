import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProductCard } from "@/components/storefront/product-card";
import { ContentRenderer } from "@/components/content/content-renderer";
import { Notice } from "@/components/ui";
import { getEffectiveCurrencyPreference } from "@/features/preferences/currency";
import { getHomeCatalog } from "@/features/catalog/queries";
import { getWishlistProductIds } from "@/features/wishlist/queries";
import { getPublishedContent } from "@/features/content/queries";
import { isAppLocale } from "@/i18n/routing";
import { buildCatalogMetadata } from "@/features/catalog/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "catalog" });
  return buildCatalogMetadata({
    locale,
    pathname: "",
    title: t("homeTitle"),
    description: t("homeBody"),
  });
}

export default async function StorefrontHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);
  const [t, currency] = await Promise.all([
    getTranslations({ locale, namespace: "catalog" }),
    getEffectiveCurrencyPreference(),
  ]);
  const [catalog, wishlist, homepageContent] = await Promise.all([
    getHomeCatalog(locale, currency),
    getWishlistProductIds(),
    getPublishedContent("homepage-main", locale),
  ]);

  return (
    <main id="main-content">
      <section className="catalog-hero">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{homepageContent?.translation.title ?? t("homeTitle")}</h1>
        <p>{homepageContent?.translation.summary ?? t("homeBody")}</p>
        {homepageContent ? (
          <ContentRenderer blocks={homepageContent.translation.blocks} />
        ) : null}
      </section>
      {process.env.DEPLOY_ENV === "local" ? (
        <div className="catalog-notice">
          <Notice tone="warning">{t("syntheticNotice")}</Notice>
        </div>
      ) : null}
      <section className="catalog-section" aria-labelledby="featured-heading">
        <div className="catalog-section-heading">
          <h2 id="featured-heading">{t("featured")}</h2>
          <p>{t("results", { count: catalog.totalCount })}</p>
        </div>
        <div className="product-grid">
          {catalog.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              locale={locale}
              imageUnavailableLabel={t("imageUnavailable")}
              wishlisted={wishlist.has(product.id)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
