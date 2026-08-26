import { notFound } from "next/navigation";

import { ContentRenderer } from "@/components/content/content-renderer";
import { Notice } from "@/components/ui";
import { getPublishedContentBySlug } from "@/features/content/queries";
import { getContentLabels } from "@/features/content/service-copy";
import { isAppLocale } from "@/i18n/routing";
import {
  buildCatalogMetadata,
  serializeStructuredData,
} from "@/features/catalog/metadata";
import { buildJournalStructuredData } from "@/features/seo/content-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) return {};
  const content = await getPublishedContentBySlug(slug, locale);
  if (!content) return { robots: { index: false, follow: false } };
  return buildCatalogMetadata({
    locale,
    pathname: `/journal/${slug}`,
    title: content.translation.meta_title ?? content.translation.title,
    description:
      content.translation.meta_description ??
      content.translation.summary ??
      content.translation.title,
    image: content.translation.social_image_url ?? undefined,
  });
}

export default async function JournalArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) return null;
  const [labels, content] = await Promise.all([
    getContentLabels(locale),
    getPublishedContentBySlug(slug, locale),
  ]);
  if (!content) notFound();
  const structuredData = buildJournalStructuredData({
    locale,
    slug,
    title: content.translation.title,
    description: content.translation.summary,
    publishedAt: content.publishedAt,
  });
  return (
    <main className="service-page" id="main-content">
      <article>
        <header>
          <p className="eyebrow">ÉPOCA · {labels.journal}</p>
          <h1>{content.translation.title}</h1>
          {content.translation.summary ? (
            <p>{content.translation.summary}</p>
          ) : null}
        </header>
        {content.fallbackDisclosed ? (
          <Notice tone="warning">
            {labels.fallbackNotice.replace(
              "{language}",
              content.resolvedLocale.toUpperCase(),
            )}
          </Notice>
        ) : null}
        <ContentRenderer blocks={content.translation.blocks} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeStructuredData(structuredData),
          }}
        />
      </article>
    </main>
  );
}
