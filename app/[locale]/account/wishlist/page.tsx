import { getTranslations } from "next-intl/server";

import { ProductCard } from "@/components/storefront/product-card";
import { getEffectiveCurrencyPreference } from "@/features/preferences/currency";
import { getCatalogProductsByIds } from "@/features/catalog/queries";
import { getCustomerAccountOverview } from "@/features/customer/queries";
import { isAppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";

export default async function CustomerWishlistPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const [t, catalogT, data, currency] = await Promise.all([
    getTranslations({ locale, namespace: "account" }),
    getTranslations({ locale, namespace: "catalog" }),
    getCustomerAccountOverview(locale),
    getEffectiveCurrencyPreference(),
  ]);
  const products = await getCatalogProductsByIds({
    locale,
    currency,
    productIds: data.wishlistProductIds,
  });
  return (
    <main className="account-page" id="main-content">
      <header className="account-header">
        <h1>{t("wishlist.title")}</h1>
        <p>{t("wishlist.body")}</p>
      </header>
      {products.length ? (
        <div className="product-grid">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              locale={locale}
              wishlisted
              position={index + 1}
              imageUnavailableLabel={catalogT("imageUnavailable")}
            />
          ))}
        </div>
      ) : (
        <section className="empty-state">
          <p>{t("wishlist.empty")}</p>
          <Link href="/" locale={locale}>
            {t("wishlist.shop")}
          </Link>
        </section>
      )}
    </main>
  );
}
