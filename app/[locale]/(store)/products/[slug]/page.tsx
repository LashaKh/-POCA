import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { ProductFacts } from "@/components/storefront/product-facts";
import { AddToCartForm } from "@/components/commerce/cart/add-to-cart-form";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { ProductCard } from "@/components/storefront/product-card";
import { Notice } from "@/components/ui";
import { getEffectiveCurrencyPreference } from "@/features/preferences/currency";
import { getCatalogProduct } from "@/features/catalog/queries";
import {
  buildCatalogMetadata,
  buildOrganizationStructuredData,
  buildProductBreadcrumbStructuredData,
  buildProductStructuredData,
  serializeStructuredData,
} from "@/features/catalog/metadata";
import { isAppLocale } from "@/i18n/routing";
import { formatMinorMoney } from "@/lib/money/format";
import { getWishlistProductIds } from "@/features/wishlist/queries";
import { WishlistButton } from "@/components/commerce/wishlist-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) return {};
  const currency = await getEffectiveCurrencyPreference();
  const record = await getCatalogProduct({ locale, currency, slug });
  if (!record) return { robots: { index: false, follow: false } };
  return buildCatalogMetadata({
    locale,
    pathname: `/products/${slug}`,
    title: record.product.name,
    description: record.product.shortDescription ?? record.product.name,
    image: record.product.primaryImagePath,
    index: true,
  });
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);
  const [t, commerce, currency] = await Promise.all([
    getTranslations({ locale, namespace: "catalog" }),
    getTranslations({ locale, namespace: "commerce" }),
    getEffectiveCurrencyPreference(),
  ]);
  const [record, wishlist] = await Promise.all([
    getCatalogProduct({ locale, currency, slug }),
    getWishlistProductIds(),
  ]);
  if (!record) notFound();
  const { product, details, images, relatedProducts } = record;
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <main className="product-page" id="main-content">
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData([
            buildProductStructuredData(product),
            buildProductBreadcrumbStructuredData(product),
            buildOrganizationStructuredData(),
          ]),
        }}
      />
      <ProductGallery
        name={product.name}
        imageUnavailableLabel={t("imageUnavailable")}
        chooseImageLabel={t("chooseImage")}
        galleryLabel={t("productImages", { name: product.name })}
        images={images.map((image) => ({
          id: image.id,
          alt: image.alt,
          src: image.path,
        }))}
      />
      <article className="product-record">
        <p className="eyebrow">{product.sku}</p>
        <h1>{product.name}</h1>
        {product.shortDescription ? (
          <p className="product-intro">{product.shortDescription}</p>
        ) : null}
        <p className="product-price">
          {formatMinorMoney(
            product.price.amountMinor,
            product.price.currency,
            locale,
          )}
        </p>
        <p className="product-availability">
          {product.availability === "available"
            ? t("available")
            : t("unavailable")}
        </p>
        <AddToCartForm
          productId={product.id}
          locale={locale}
          available={product.availability === "available"}
          labels={{
            add: commerce("cart.add"),
            added: commerce("cart.added"),
            failed: commerce("cart.actionFailed"),
            quantity: commerce("cart.quantity"),
          }}
        />
        <WishlistButton
          productId={product.id}
          locale={locale}
          initialSaved={wishlist.has(product.id)}
          labels={{
            save: commerce("wishlist.save"),
            remove: commerce("wishlist.remove"),
            failed: commerce("wishlist.actionFailed"),
          }}
        />
        <ProductFacts
          product={product}
          labels={{
            dimensions: t("dimensions"),
            materials: t("materials"),
            colors: t("colors"),
            origin: t("origin"),
          }}
        />
        {details.longDescription ? <p>{details.longDescription}</p> : null}
        <dl className="product-facts">
          {details.construction ? (
            <div>
              <dt>{t("construction")}</dt>
              <dd>{details.construction}</dd>
            </div>
          ) : null}
          {details.condition ? (
            <div>
              <dt>{t("condition")}</dt>
              <dd>{details.condition}</dd>
            </div>
          ) : null}
          {details.careText ? (
            <div>
              <dt>{t("care")}</dt>
              <dd>{details.careText}</dd>
            </div>
          ) : null}
          {details.deliveryClass ? (
            <div>
              <dt>{t("delivery")}</dt>
              <dd>{details.deliveryClass}</dd>
            </div>
          ) : null}
          {details.ageMinYear || details.ageMaxYear ? (
            <div>
              <dt>{t("age")}</dt>
              <dd>
                {details.ageMinYear ?? "?"}–{details.ageMaxYear ?? "?"}
              </dd>
            </div>
          ) : null}
          {details.pile ? (
            <div>
              <dt>{t("pile")}</dt>
              <dd>{details.pile}</dd>
            </div>
          ) : null}
          {details.handmade !== null ? (
            <div>
              <dt>{t("handmade")}</dt>
              <dd>{details.handmade ? t("yes") : t("no")}</dd>
            </div>
          ) : null}
          {details.provenanceSummary ? (
            <div>
              <dt>{t("provenance")}</dt>
              <dd>{details.provenanceSummary}</dd>
            </div>
          ) : null}
        </dl>
        <Notice>{t("variationNote")}</Notice>
        <section className="service-summary">
          <h2>{t("returns")}</h2>
          <p>{t("returnsSummary")}</p>
        </section>
      </article>
      {relatedProducts.length ? (
        <section className="related-products">
          <h2>{t("related")}</h2>
          <div className="product-grid">
            {relatedProducts.map((related, index) => (
              <ProductCard
                key={related.id}
                product={related}
                locale={locale}
                imageUnavailableLabel={t("imageUnavailable")}
                wishlisted={wishlist.has(related.id)}
                position={index + 1}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
