import type { SupportedCurrency } from "@/i18n/preferences";
import type { AppLocale } from "@/i18n/routing";
import { minorAmount } from "@/lib/money/minor";
import type { LocalizedRouteSet } from "@/features/seo/routes";

import { catalogProductRowSchema } from "./schema";

export type CatalogProduct = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  shortDescription?: string;
  contentLocale: AppLocale;
  requestedLocale: AppLocale;
  usedFallback: boolean;
  price: {
    amountMinor: ReturnType<typeof minorAmount>;
    currency: SupportedCurrency;
  };
  availability: "available" | "unavailable";
  dimensions?: { widthMm: number; lengthMm: number };
  materials: string[];
  colors: string[];
  origin?: string;
  primaryImagePath?: string;
  seoTitle?: string;
  seoDescription?: string;
  condition?: string;
  structuredDataEligible: boolean;
  brand?: string;
  gtin?: string;
  mpn?: string;
  identifierExists: boolean | null;
  publishedAt?: string;
  updatedAt?: string;
  routeSet?: LocalizedRouteSet;
};

export function selectLocalizedTranslation<T extends { locale: AppLocale }>(
  translations: readonly T[],
  requestedLocale: AppLocale,
): (T & { usedFallback: boolean }) | undefined {
  const selected =
    translations.find(
      (translation) => translation.locale === requestedLocale,
    ) ??
    translations.find((translation) => translation.locale === "en") ??
    translations.find((translation) => translation.locale === "ka") ??
    translations[0];

  return selected
    ? { ...selected, usedFallback: selected.locale !== requestedLocale }
    : undefined;
}

export function mapCatalogProduct(input: unknown): CatalogProduct {
  const row = catalogProductRowSchema.parse(input);
  const dimensions =
    row.widthMm && row.lengthMm
      ? { widthMm: row.widthMm, lengthMm: row.lengthMm }
      : undefined;

  return {
    id: row.id,
    sku: row.sku,
    slug: row.slug,
    name: row.name,
    shortDescription: row.shortDescription,
    contentLocale: row.contentLocale,
    requestedLocale: row.requestedLocale,
    usedFallback: row.contentLocale !== row.requestedLocale,
    price: {
      amountMinor: minorAmount(row.amountMinor),
      currency: row.currency,
    },
    availability: row.availableQuantity > 0 ? "available" : "unavailable",
    dimensions,
    materials: row.materials,
    colors: row.colors,
    origin: row.originVerified ? row.origin : undefined,
    primaryImagePath: row.primaryImagePath,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    condition: row.condition,
    structuredDataEligible: row.structuredDataEligible,
    brand: row.brand,
    gtin: row.gtin,
    mpn: row.mpn,
    identifierExists: row.identifierExists,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
  };
}
