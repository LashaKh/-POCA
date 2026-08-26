import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProductCard } from "@/components/storefront/product-card";
import { getEffectiveCurrencyPreference } from "@/features/preferences/currency";
import { searchCatalog } from "@/features/catalog/queries";
import { parseCatalogSearchParams } from "@/features/catalog/search-params";
import { getWishlistProductIds } from "@/features/wishlist/queries";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);
  const [t, currency, rawSearch] = await Promise.all([
    getTranslations({ locale, namespace: "catalog" }),
    getEffectiveCurrencyPreference(),
    searchParams,
  ]);
  const parsed = parseCatalogSearchParams({ ...rawSearch, currency });
  const [result, wishlist] = await Promise.all([
    searchCatalog({ locale, currency, params: parsed }),
    getWishlistProductIds(),
  ]);

  return (
    <main className="catalog-page" id="main-content">
      <header className="catalog-page-header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("search")}</h1>
      </header>
      <form
        className="catalog-search-form"
        action={`/${locale}/search`}
        role="search"
      >
        <label htmlFor="catalog-search">{t("search")}</label>
        <input
          id="catalog-search"
          name="q"
          type="search"
          defaultValue={parsed.query}
          maxLength={100}
          autoFocus
        />
        <button type="submit">{t("search")}</button>
      </form>
      <p aria-live="polite">{t("results", { count: result.totalCount })}</p>
      {result.products.length ? (
        <div className="product-grid">
          {result.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              locale={locale}
              imageUnavailableLabel={t("imageUnavailable")}
              wishlisted={wishlist.has(product.id)}
            />
          ))}
        </div>
      ) : (
        <section className="empty-state">
          <h2>{t("noResults")}</h2>
          <p>{parsed.query ? `“${parsed.query}”` : null}</p>
          <Link href="/search" locale={locale}>
            {t("clearFilters")}
          </Link>
        </section>
      )}
    </main>
  );
}
