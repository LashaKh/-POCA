import type { CatalogProduct } from "@/features/catalog/types";
import type { AppLocale } from "@/i18n/routing";
import { formatMinorMoney } from "@/lib/money/format";
import { WishlistButton } from "@/components/commerce/wishlist-button";
import { Link } from "@/i18n/navigation";

import { ResponsiveProductImage } from "./responsive-product-image";

export function ProductCard({
  product,
  locale,
  imageUnavailableLabel = "image unavailable",
  wishlisted = false,
  wishlistLabels,
  position,
  motionReveal = false,
}: {
  product: CatalogProduct;
  locale: AppLocale;
  imageUnavailableLabel?: string;
  wishlisted?: boolean;
  wishlistLabels?: { save: string; remove: string; failed: string };
  position?: number;
  motionReveal?: boolean;
}) {
  const productLocale = product.usedFallback ? product.contentLocale : locale;
  const availabilityLabels = {
    ka: { available: "ხელმისაწვდომია", unavailable: "მიუწვდომელია" },
    en: { available: "Available", unavailable: "Unavailable" },
    de: { available: "Verfügbar", unavailable: "Nicht verfügbar" },
    ru: { available: "В наличии", unavailable: "Недоступен" },
  } as const;
  const defaultWishlistLabels = {
    ka: {
      save: "შენახვა",
      remove: "სურვილებიდან წაშლა",
      failed: "სცადეთ ხელახლა",
    },
    en: { save: "Save", remove: "Remove from wishlist", failed: "Try again" },
    de: {
      save: "Speichern",
      remove: "Von der Wunschliste entfernen",
      failed: "Erneut versuchen",
    },
    ru: {
      save: "Сохранить",
      remove: "Удалить из избранного",
      failed: "Повторите попытку",
    },
  } as const;

  return (
    <article
      className="product-card"
      data-motion-order={motionReveal ? position : undefined}
      data-motion-reveal={motionReveal ? "card" : undefined}
    >
      <Link href={`/products/${product.slug}`} locale={productLocale}>
        <div className="product-card-media">
          <ResponsiveProductImage
            src={product.primaryImagePath}
            alt={product.name}
            fallbackLabel={`${product.name}: ${imageUnavailableLabel}`}
            priority={position === 1}
          />
          <p className="product-card-record" aria-hidden="true">
            {position ? <span>{String(position).padStart(2, "0")}</span> : null}
            <span>{product.sku}</span>
          </p>
        </div>
        <div className="product-card-copy">
          <h2>{product.name}</h2>
          {product.shortDescription ? <p>{product.shortDescription}</p> : null}
          <div className="product-card-meta">
            <p>
              {formatMinorMoney(
                product.price.amountMinor,
                product.price.currency,
                locale,
              )}
            </p>
            <p data-availability={product.availability}>
              {availabilityLabels[locale][product.availability]}
            </p>
          </div>
        </div>
      </Link>
      <WishlistButton
        productId={product.id}
        locale={locale}
        initialSaved={wishlisted}
        labels={wishlistLabels ?? defaultWishlistLabels[locale]}
      />
    </article>
  );
}
