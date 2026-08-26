import type { CatalogProduct } from "@/features/catalog/types";
import type { AppLocale } from "@/i18n/routing";
import { formatMinorMoney } from "@/lib/money/format";
import { WishlistButton } from "@/components/commerce/wishlist-button";

import { ResponsiveProductImage } from "./responsive-product-image";

export function ProductCard({
  product,
  locale,
  imageUnavailableLabel = "image unavailable",
  wishlisted = false,
  wishlistLabels,
}: {
  product: CatalogProduct;
  locale: AppLocale;
  imageUnavailableLabel?: string;
  wishlisted?: boolean;
  wishlistLabels?: { save: string; remove: string; failed: string };
}) {
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
    <article className="product-card">
      <a href={`/${locale}/products/${product.slug}`}>
        <ResponsiveProductImage
          src={product.primaryImagePath}
          alt={product.name}
          fallbackLabel={`${product.name}: ${imageUnavailableLabel}`}
        />
        <div className="product-card-copy">
          <h2>{product.name}</h2>
          {product.shortDescription ? <p>{product.shortDescription}</p> : null}
          <p>
            {formatMinorMoney(
              product.price.amountMinor,
              product.price.currency,
              locale,
            )}
          </p>
          <p>{availabilityLabels[locale][product.availability]}</p>
        </div>
      </a>
      <WishlistButton
        productId={product.id}
        locale={locale}
        initialSaved={wishlisted}
        labels={wishlistLabels ?? defaultWishlistLabels[locale]}
      />
    </article>
  );
}
