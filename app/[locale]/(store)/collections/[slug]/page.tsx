import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/storefront/product-card";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import {
  CatalogControls,
  CatalogPagination,
} from "@/components/storefront/catalog-controls";
import { getEffectiveCurrencyPreference } from "@/features/preferences/currency";
import {
  getCatalogFacets,
  getCollection,
  searchCatalog,
} from "@/features/catalog/queries";
import {
  buildBreadcrumbStructuredData,
  buildCatalogMetadata,
  getCanonicalOrigin,
  serializeStructuredData,
} from "@/features/catalog/metadata";
import { parseCatalogSearchParams } from "@/features/catalog/search-params";
import { getWishlistProductIds } from "@/features/wishlist/queries";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) return {};
  const [collection, query] = await Promise.all([
    getCollection(locale, slug),
    searchParams,
  ]);
  if (!collection) return { robots: { index: false, follow: false } };
  return buildCatalogMetadata({
    locale,
    routeSet: collection.routeSet,
    title: collection.seo_title ?? collection.name,
    description:
      collection.seo_description ?? collection.description ?? collection.name,
    index: Object.keys(query).length === 0,
  });
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);
  const [t, common, currency, collection, rawSearch] = await Promise.all([
    getTranslations({ locale, namespace: "catalog" }),
    getTranslations({ locale, namespace: "common" }),
    getEffectiveCurrencyPreference(),
    getCollection(locale, slug),
    searchParams,
  ]);
  if (!collection) notFound();
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const parsed = parseCatalogSearchParams({
    ...rawSearch,
    collection: collection.slug,
    currency,
  });
  const [result, facets, wishlist] = await Promise.all([
    searchCatalog({
      locale: collection.routeSet.resolvedLocale,
      currency,
      params: parsed,
    }),
    getCatalogFacets({
      locale: collection.routeSet.resolvedLocale,
      currency,
      collection: collection.slug,
    }),
    getWishlistProductIds(),
  ]);

  return (
    <main className="catalog-page" id="main-content">
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(
            buildBreadcrumbStructuredData([
              {
                name: common("home"),
                url: `${getCanonicalOrigin()}/${locale}`,
              },
              {
                name: t("collectionsTitle"),
                url: `${getCanonicalOrigin()}/${locale}/collections`,
              },
              { name: collection.name, url: collection.routeSet.canonicalUrl },
            ]),
          ),
        }}
      />
      <Breadcrumbs
        locale={locale}
        label={t("breadcrumbs")}
        items={[
          { label: common("home"), href: "/" },
          { label: t("collectionsTitle"), href: "/collections" },
          { label: collection.name },
        ]}
      />
      <header className="catalog-page-header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{collection.name}</h1>
        {collection.description ? <p>{collection.description}</p> : null}
      </header>
      <CatalogControls
        locale={locale}
        slug={collection.slug}
        parsed={parsed}
        facets={facets}
        labels={{
          search: t("search"),
          sort: t("sort"),
          relevance: t("sortRelevance"),
          newest: t("sortNewest"),
          priceAsc: t("sortPriceAsc"),
          priceDesc: t("sortPriceDesc"),
          inStock: t("inStock"),
          material: t("material"),
          color: t("color"),
          all: t("all"),
          apply: t("apply"),
        }}
      />
      <div className="catalog-section-heading">
        <p aria-live="polite">{t("results", { count: result.totalCount })}</p>
      </div>
      {result.products.length ? (
        <div className="product-grid">
          {result.products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              locale={locale}
              imageUnavailableLabel={t("imageUnavailable")}
              wishlisted={wishlist.has(product.id)}
              position={index + 1}
            />
          ))}
        </div>
      ) : (
        <section className="empty-state">
          <h2>{t("noResults")}</h2>
          <Link href={`/collections/${collection.slug}`} locale={locale}>
            {t("clearFilters")}
          </Link>
        </section>
      )}
      <CatalogPagination
        locale={locale}
        pathname={`/collections/${collection.slug}`}
        parsed={parsed}
        totalCount={result.totalCount}
        label={t("catalogPages")}
        labels={{ previous: t("previous"), next: t("next") }}
      />
    </main>
  );
}
