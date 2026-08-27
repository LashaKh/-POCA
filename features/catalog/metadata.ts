import type { Metadata } from "next";

import type { CatalogProduct } from "./types";

import {
  buildStaticLocalizedRouteSet,
  routeSetLanguages,
  type LocalizedRouteSet,
} from "@/features/seo/routes";
import type { AppLocale } from "@/i18n/routing";

export const socialFallbackPath = "/opengraph-image";

export function getCanonicalOrigin() {
  const configured = process.env.SITE_URL;
  if (configured) return new URL(configured).origin;
  if (process.env.DEPLOY_ENV === "production") {
    throw new Error("Production metadata requires SITE_URL.");
  }
  return "http://127.0.0.1:3000";
}

export function getLocalizedAlternates(pathname: string) {
  const routeSet = buildStaticLocalizedRouteSet({
    origin: getCanonicalOrigin(),
    locale: "ka",
    pathname,
  });
  return routeSetLanguages(routeSet);
}

export function buildCatalogMetadata({
  locale,
  pathname,
  routeSet,
  title,
  description,
  image,
  index = true,
}: {
  locale: AppLocale;
  pathname?: string;
  routeSet?: LocalizedRouteSet;
  title: string;
  description: string;
  image?: string;
  index?: boolean;
}): Metadata {
  const origin = getCanonicalOrigin();
  const resolvedRouteSet =
    routeSet ??
    buildStaticLocalizedRouteSet({
      origin,
      locale,
      pathname: pathname ?? "/",
      allowIndex: index,
    });
  const shouldIndex = index && resolvedRouteSet.indexable;
  const socialImage = image ?? `${origin}${socialFallbackPath}`;
  return {
    title,
    description,
    alternates: {
      canonical: resolvedRouteSet.canonicalUrl,
      languages: routeSetLanguages(resolvedRouteSet),
    },
    robots: { index: shouldIndex, follow: true },
    openGraph: {
      type: "website",
      siteName: "ÉPOCA",
      locale,
      title,
      description,
      url: resolvedRouteSet.canonicalUrl,
      images: [{ url: socialImage, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export function isProductStructuredDataEligible(product: CatalogProduct) {
  return Boolean(
    product.structuredDataEligible &&
    product.shortDescription &&
    product.primaryImagePath &&
    product.condition &&
    product.routeSet,
  );
}

export function buildProductStructuredData(
  product: CatalogProduct,
  options: {
    images?: string[];
    seller?: { name: string; url?: string };
  } = {},
) {
  if (!isProductStructuredDataEligible(product)) return undefined;
  const images = [product.primaryImagePath, ...(options.images ?? [])].filter(
    (image): image is string => Boolean(image),
  );
  const canonical = product.routeSet?.canonicalUrl;
  if (!canonical) return undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    sku: product.sku,
    url: canonical,
    image: [...new Set(images)],
    itemCondition: product.condition?.toLowerCase().includes("new")
      ? "https://schema.org/NewCondition"
      : "https://schema.org/UsedCondition",
    ...(product.brand
      ? { brand: { "@type": "Brand", name: product.brand } }
      : {}),
    ...(product.gtin ? { gtin: product.gtin } : {}),
    ...(product.mpn ? { mpn: product.mpn } : {}),
    ...(product.origin ? { countryOfOrigin: product.origin } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: product.price.currency,
      price: (product.price.amountMinor / 100).toFixed(2),
      availability:
        product.availability === "available"
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: canonical,
      ...(options.seller
        ? {
            seller: {
              "@type": "Organization",
              name: options.seller.name,
              ...(options.seller.url ? { url: options.seller.url } : {}),
            },
          }
        : {}),
    },
  };
}

export function buildWebsiteStructuredData(locale: AppLocale) {
  const origin = getCanonicalOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ÉPOCA",
    url: `${origin}/${locale}`,
    inLanguage: locale,
  };
}

export function buildOrganizationStructuredData(input?: {
  logoUrl?: string;
  email?: string;
  telephone?: string;
  sameAs?: string[];
}) {
  const origin = getCanonicalOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: "ÉPOCA",
    url: origin,
    ...(input?.logoUrl ? { logo: input.logoUrl } : {}),
    ...(input?.email ? { email: input.email } : {}),
    ...(input?.telephone ? { telephone: input.telephone } : {}),
    ...(input?.sameAs?.length ? { sameAs: input.sameAs } : {}),
  };
}

export type BreadcrumbItem = { name: string; url: string };

export function buildBreadcrumbStructuredData(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildProductBreadcrumbStructuredData(product: CatalogProduct) {
  const origin = getCanonicalOrigin();
  const productUrl =
    product.routeSet?.canonicalUrl ??
    `${origin}/${product.requestedLocale}/products/${product.slug}`;
  return buildBreadcrumbStructuredData([
    { name: "ÉPOCA", url: `${origin}/${product.requestedLocale}` },
    {
      name: "Collections",
      url: `${origin}/${product.requestedLocale}/collections`,
    },
    { name: product.name, url: productUrl },
  ]);
}

export function serializeStructuredData(value: unknown) {
  return JSON.stringify(value)
    .replaceAll("&", "\\u0026")
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}
