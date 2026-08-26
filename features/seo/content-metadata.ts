import type { Metadata } from "next";

import { buildCatalogMetadata } from "@/features/catalog/metadata";
import { getPublishedContent } from "@/features/content/queries";
import { getFallbackServiceContent } from "@/features/content/service-copy";
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
  return buildCatalogMetadata({
    locale,
    pathname: `/${key}`,
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
  slug: string;
  title: string;
  description?: string | null;
  publishedAt?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    inLanguage: input.locale,
    ...(input.description ? { description: input.description } : {}),
    ...(input.publishedAt ? { datePublished: input.publishedAt } : {}),
    author: { "@type": "Organization", name: "ÉPOCA" },
  };
}
