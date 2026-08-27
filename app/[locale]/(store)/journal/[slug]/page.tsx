import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ContentRenderer } from "@/components/content/content-renderer";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Notice } from "@/components/ui";
import {
  getPublishedContentBySlug,
  getPublishedContentRoutes,
} from "@/features/content/queries";
import { getContentLabels } from "@/features/content/service-copy";
import { isAppLocale } from "@/i18n/routing";
import {
  buildCatalogMetadata,
  buildBreadcrumbStructuredData,
  getCanonicalOrigin,
  serializeStructuredData,
} from "@/features/catalog/metadata";
import { buildJournalStructuredData } from "@/features/seo/content-metadata";
import { buildLocalizedRouteSet } from "@/features/seo/routes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) return {};
  const content = await getPublishedContentBySlug(slug, locale);
  if (!content) return { robots: { index: false, follow: false } };
  const routes = await getPublishedContentRoutes(content.entryKey);
  const routeSet = buildLocalizedRouteSet({
    origin: getCanonicalOrigin(),
    requestedLocale: locale,
    resolvedLocale: content.resolvedLocale,
    routes,
    pathFor: (route) => `/${route.locale}/journal/${route.slug}`,
  });
  return buildCatalogMetadata({
    locale,
    routeSet,
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
  const [labels, content, common, catalog] = await Promise.all([
    getContentLabels(locale),
    getPublishedContentBySlug(slug, locale),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "catalog" }),
  ]);
  if (!content) notFound();
  const routes = await getPublishedContentRoutes(content.entryKey);
  const routeSet = buildLocalizedRouteSet({
    origin: getCanonicalOrigin(),
    requestedLocale: locale,
    resolvedLocale: content.resolvedLocale,
    routes,
    pathFor: (route) => `/${route.locale}/journal/${route.slug}`,
  });
  const structuredData = [
    buildJournalStructuredData({
      locale,
      canonicalUrl: routeSet.canonicalUrl,
      title: content.translation.title,
      description: content.translation.summary,
      publishedAt: content.publishedAt,
      modifiedAt: content.publishedAt,
      images: content.translation.social_image_url
        ? [content.translation.social_image_url]
        : undefined,
    }),
    buildBreadcrumbStructuredData([
      { name: common("home"), url: `${getCanonicalOrigin()}/${locale}` },
      {
        name: labels.journal,
        url: `${getCanonicalOrigin()}/${locale}/journal`,
      },
      { name: content.translation.title, url: routeSet.canonicalUrl },
    ]),
  ];
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <main className="service-page" id="main-content">
      <Breadcrumbs
        locale={locale}
        label={catalog("breadcrumbs")}
        items={[
          { label: common("home"), href: "/" },
          { label: labels.journal, href: "/journal" },
          { label: content.translation.title },
        ]}
      />
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
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeStructuredData(structuredData),
          }}
        />
      </article>
    </main>
  );
}
