import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProductCard } from "@/components/storefront/product-card";
import { ResponsiveProductImage } from "@/components/storefront/responsive-product-image";
import { ContentRenderer } from "@/components/content/content-renderer";
import { ArrowUpRightIcon, Notice } from "@/components/ui";
import { getFallbackServiceContent } from "@/features/content/service-copy";
import { getEffectiveCurrencyPreference } from "@/features/preferences/currency";
import { getHomeCatalog } from "@/features/catalog/queries";
import { getWishlistProductIds } from "@/features/wishlist/queries";
import {
  getPublishedContent,
  getPublishedContentRoutes,
} from "@/features/content/queries";
import { isAppLocale } from "@/i18n/routing";
import {
  buildCatalogMetadata,
  buildOrganizationStructuredData,
  buildWebsiteStructuredData,
  getCanonicalOrigin,
  serializeStructuredData,
} from "@/features/catalog/metadata";
import { buildLocalizedRouteSet } from "@/features/seo/routes";
import { Link } from "@/i18n/navigation";
import { formatMinorMoney } from "@/lib/money/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const [t, homepageContent] = await Promise.all([
    getTranslations({ locale, namespace: "catalog" }),
    getPublishedContent("homepage-main", locale),
  ]);
  const routes = homepageContent
    ? await getPublishedContentRoutes(homepageContent.entryKey)
    : undefined;
  const routeSet = routes?.length
    ? buildLocalizedRouteSet({
        origin: getCanonicalOrigin(),
        requestedLocale: locale,
        resolvedLocale: homepageContent?.resolvedLocale ?? locale,
        routes,
        pathFor: (route) => `/${route.locale}`,
      })
    : undefined;
  return buildCatalogMetadata({
    locale,
    pathname: "",
    routeSet,
    title: homepageContent?.translation.title ?? t("homeTitle"),
    description: homepageContent?.translation.summary ?? t("homeBody"),
    index: !homepageContent?.fallbackDisclosed,
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
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const serviceLinks = (["about", "delivery", "faq"] as const).map((key) => ({
    key,
    ...getFallbackServiceContent(key, locale),
  }));
  const productsWithImages = catalog.products.filter(
    (product) => product.primaryImagePath,
  );
  const heroProduct = productsWithImages[0] ?? catalog.products[0];
  const heroTitle = homepageContent?.translation.title ?? t("homeTitle");
  const featuredProducts = [...productsWithImages, ...catalog.products]
    .filter(
      (product, index, products) =>
        product.id !== heroProduct?.id &&
        products.findIndex((candidate) => candidate.id === product.id) ===
          index,
    )
    .slice(0, 4);

  return (
    <main className="storefront-home" id="main-content">
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData([
            buildWebsiteStructuredData(locale),
            buildOrganizationStructuredData(),
          ]),
        }}
      />
      <section className="catalog-hero">
        <div className="catalog-hero-copy">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 aria-label={heroTitle}>
            {heroTitle.split(/\s+/).map((word, index) => (
              <span
                className="catalog-hero-word"
                aria-hidden="true"
                key={`${word}-${index}`}
              >
                <span>{word}</span>{" "}
              </span>
            ))}
          </h1>
          <p className="catalog-hero-summary">
            {homepageContent?.translation.summary ?? t("homeBody")}
          </p>
          <div className="catalog-hero-actions">
            <Link className="button-link" href="/collections" locale={locale}>
              <span>{t("homeBrowse")}</span>
              <ArrowUpRightIcon className="action-icon" />
            </Link>
            <Link className="catalog-hero-link" href="/about" locale={locale}>
              {t("homeAbout")}
              <ArrowUpRightIcon className="action-icon" />
            </Link>
          </div>
        </div>
        {heroProduct ? (
          <Link
            className="catalog-hero-record"
            href={`/products/${heroProduct.slug}`}
            locale={
              heroProduct.usedFallback ? heroProduct.contentLocale : locale
            }
          >
            <div className="catalog-hero-media">
              <ResponsiveProductImage
                src={heroProduct.primaryImagePath}
                alt={heroProduct.name}
                fallbackLabel={`${heroProduct.name}: ${t("imageUnavailable")}`}
                width={1200}
                height={1500}
                sizes="(max-width: 48rem) 100vw, 45vw"
                priority
              />
              <span className="catalog-hero-record-code" aria-hidden="true">
                {heroProduct.sku}
              </span>
            </div>
            <span className="catalog-hero-record-caption">
              <strong>{heroProduct.name}</strong>
              <span>
                {formatMinorMoney(
                  heroProduct.price.amountMinor,
                  heroProduct.price.currency,
                  locale,
                )}
              </span>
            </span>
          </Link>
        ) : null}
      </section>
      {process.env.DEPLOY_ENV === "local" ? (
        <div className="catalog-notice">
          <Notice tone="warning">{t("syntheticNotice")}</Notice>
        </div>
      ) : null}
      {homepageContent ? (
        <section
          className="home-editorial"
          aria-label={t("homeEditorial")}
          data-motion-reveal="curtain"
        >
          <div className="home-editorial-index">
            <p className="eyebrow">ÉPOCA · 02</p>
            <p>{t("homeEditorial")}</p>
          </div>
          <ContentRenderer blocks={homepageContent.translation.blocks} />
        </section>
      ) : null}
      <section className="catalog-section" aria-labelledby="featured-heading">
        <div className="catalog-section-heading" data-motion-reveal="rise">
          <h2 id="featured-heading">{t("featured")}</h2>
          <p>{t("results", { count: catalog.totalCount })}</p>
        </div>
        <div className="product-grid">
          {featuredProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              locale={locale}
              imageUnavailableLabel={t("imageUnavailable")}
              wishlisted={wishlist.has(product.id)}
              position={index + 1}
              motionReveal
            />
          ))}
        </div>
      </section>
      <section
        className="home-service-index"
        aria-labelledby="home-service-heading"
      >
        <div className="home-service-heading" data-motion-reveal="rise">
          <p className="eyebrow">ÉPOCA · 03</p>
          <h2 id="home-service-heading">{t("homeServices")}</h2>
        </div>
        <div className="home-service-grid">
          {serviceLinks.map((service, index) => (
            <Link
              className="home-service-card"
              href={`/${service.key}`}
              key={service.key}
              locale={locale}
              data-motion-order={index + 1}
              data-motion-reveal="card"
            >
              <span aria-hidden="true">0{index + 1}</span>
              <h3>{service.title}</h3>
              <p>{service.summary}</p>
              <strong>
                {t("homeRead")}
                <ArrowUpRightIcon className="action-icon" />
              </strong>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
