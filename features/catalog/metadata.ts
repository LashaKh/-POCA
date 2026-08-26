import type { Metadata } from "next";

import type { CatalogProduct } from "./types";

import { locales, type AppLocale } from "@/i18n/routing";

export function getCanonicalOrigin() {
  const configured = process.env.SITE_URL;
  if (configured) return new URL(configured).origin;
  if (process.env.DEPLOY_ENV === "production") {
    throw new Error("Production metadata requires SITE_URL.");
  }
  return "http://127.0.0.1:3000";
}

export function getLocalizedAlternates(pathname: string) {
  const origin = getCanonicalOrigin();
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return {
    ...Object.fromEntries(
      locales.map((locale) => [locale, `${origin}/${locale}${normalizedPath}`]),
    ),
    "x-default": `${origin}/ka${normalizedPath}`,
  };
}

export function buildCatalogMetadata({
  locale,
  pathname,
  title,
  description,
  image,
  index = true,
}: {
  locale: AppLocale;
  pathname: string;
  title: string;
  description: string;
  image?: string;
  index?: boolean;
}): Metadata {
  const origin = getCanonicalOrigin();
  const canonical = `${origin}/${locale}${pathname}`;
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: getLocalizedAlternates(pathname),
    },
    robots: { index, follow: index },
    openGraph: {
      type: "website",
      siteName: "ÉPOCA",
      locale,
      title,
      description,
      url: canonical,
      images: image ? [{ url: image, alt: title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export function buildProductStructuredData(product: CatalogProduct) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    url: `${getCanonicalOrigin()}/${product.requestedLocale}/products/${product.slug}`,
    ...(product.primaryImagePath ? { image: [product.primaryImagePath] } : {}),
    ...(product.origin ? { countryOfOrigin: product.origin } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: product.price.currency,
      price: (product.price.amountMinor / 100).toFixed(2),
      availability:
        product.availability === "available"
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `${getCanonicalOrigin()}/${product.requestedLocale}/products/${product.slug}`,
    },
  };
}

export function buildOrganizationStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ÉPOCA",
    url: getCanonicalOrigin(),
    address: {
      "@type": "PostalAddress",
      addressCountry: "GE",
    },
  };
}

export function buildProductBreadcrumbStructuredData(product: CatalogProduct) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "ÉPOCA",
        item: `${getCanonicalOrigin()}/${product.requestedLocale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: product.name,
        item: `${getCanonicalOrigin()}/${product.requestedLocale}/products/${product.slug}`,
      },
    ],
  };
}

export function serializeStructuredData(value: unknown) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
