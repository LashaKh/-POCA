import type { Metadata } from "next";

import { buildCatalogMetadata } from "@/features/catalog/metadata";
import {
  getPublishedContent,
  getPublishedContentRoutes,
} from "@/features/content/queries";
import { getFallbackServiceContent } from "@/features/content/service-copy";
import { getCanonicalOrigin } from "@/features/catalog/metadata";
import { buildLocalizedRouteSet } from "@/features/seo/routes";
import type { AppLocale } from "@/i18n/routing";

type ServiceKey =
  | "about"
  | "faq"
  | "delivery"
  | "returns"
  | "privacy"
  | "cookie"
  | "terms";

export async function buildServiceContentMetadata(
  locale: AppLocale,
  key: ServiceKey,
): Promise<Metadata> {
  const [content, fallback] = await Promise.all([
    getPublishedContent(key, locale),
    Promise.resolve(getFallbackServiceContent(key, locale)),
  ]);
  const title =
    content?.translation.meta_title ??
    content?.translation.title ??
    fallback.title;
  const description =
    content?.translation.meta_description ??
    content?.translation.summary ??
    fallback.summary;
  const routes = content
    ? await getPublishedContentRoutes(content.entryKey)
    : undefined;
  const routeSet = routes?.length
    ? buildLocalizedRouteSet({
        origin: getCanonicalOrigin(),
        requestedLocale: locale,
        resolvedLocale: content?.resolvedLocale ?? locale,
        routes,
        pathFor: (route) => `/${route.locale}/${key}`,
      })
    : undefined;
  return buildCatalogMetadata({
    locale,
    pathname: `/${key}`,
    routeSet,
    title,
    description,
    image: content?.translation.social_image_url ?? undefined,
    index: content
      ? content.legalStatus !== "draft_unapproved"
      : !["delivery", "returns", "privacy", "cookie", "terms"].includes(key),
  });
}

export function buildJournalStructuredData(input: {
  locale: AppLocale;
  canonicalUrl: string;
  title: string;
  description?: string | null;
  publishedAt?: string | null;
  modifiedAt?: string | null;
  images?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    mainEntityOfPage: input.canonicalUrl,
    url: input.canonicalUrl,
    inLanguage: input.locale,
    ...(input.description ? { description: input.description } : {}),
    ...(input.publishedAt ? { datePublished: input.publishedAt } : {}),
    ...(input.modifiedAt ? { dateModified: input.modifiedAt } : {}),
    ...(input.images?.length ? { image: input.images } : {}),
    author: { "@type": "Organization", name: "ÉPOCA" },
    publisher: {
      "@type": "Organization",
      name: "ÉPOCA",
      url: getCanonicalOrigin(),
    },
  };
}
