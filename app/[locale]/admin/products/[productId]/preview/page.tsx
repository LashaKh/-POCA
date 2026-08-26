import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { ProductGallery } from "@/components/storefront/product-gallery";
import { getCatalogAdminLabels } from "@/features/catalog/admin-copy";
import { getAdminProductDetail } from "@/features/catalog/admin-queries";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";
import { formatMinorMoney } from "@/lib/money/format";
import { minorAmount } from "@/lib/money/minor";

export const dynamic = "force-dynamic";

export default async function CatalogProductPreviewPage({
  params,
}: {
  params: Promise<{ locale: string; productId: string }>;
}) {
  const { locale, productId } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);
  const detail = await getAdminProductDetail(productId);
  if (!detail) notFound();
  const labels = getCatalogAdminLabels(locale);
  const translation =
    detail.translations.find((item) => item.locale === locale) ??
    detail.translations.find((item) => item.locale === "en");
  const price = detail.prices.find(
    (item) => item.currency === "GEL" && item.market_code === null,
  );
  const currency =
    price?.currency === "GEL" ||
    price?.currency === "USD" ||
    price?.currency === "EUR"
      ? price.currency
      : undefined;

  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <Link href={`/admin/products/${productId}/edit`} locale={locale}>
          {labels.backEditor}
        </Link>
        <p className="eyebrow">{detail.product.sku}</p>
        <h1>{labels.preview}</h1>
        <p className="warning-message">{labels.previewWarning}</p>
      </header>
      <div className="product-page admin-product-preview">
        <ProductGallery
          name={translation?.name ?? detail.product.sku}
          images={detail.previewImages}
        />
        <article className="product-record">
          <p className="eyebrow">{detail.product.status}</p>
          <h2>{translation?.name ?? detail.product.sku}</h2>
          {translation?.short_description ? (
            <p className="product-intro">{translation.short_description}</p>
          ) : null}
          {price && currency ? (
            <p className="product-price">
              {formatMinorMoney(
                minorAmount(price.amount_minor),
                currency,
                locale,
              )}
            </p>
          ) : null}
          <dl className="product-facts">
            <div>
              <dt>{labels.materials}</dt>
              <dd>{detail.product.materials.join(", ") || "—"}</dd>
            </div>
            <div>
              <dt>{labels.colors}</dt>
              <dd>{detail.product.colors.join(", ") || "—"}</dd>
            </div>
            <div>
              <dt>{labels.origin}</dt>
              <dd>{detail.product.origin || "—"}</dd>
            </div>
          </dl>
          {translation?.long_description ? (
            <p>{translation.long_description}</p>
          ) : null}
        </article>
      </div>
    </main>
  );
}
