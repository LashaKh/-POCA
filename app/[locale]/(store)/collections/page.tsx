import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { buildCatalogMetadata } from "@/features/catalog/metadata";
import { getPublishedCollections } from "@/features/catalog/queries";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "catalog" });
  return buildCatalogMetadata({
    locale,
    pathname: "/collections",
    title: t("collectionsTitle"),
    description: t("collectionsIntro"),
  });
}

export default async function CollectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);
  const [t, common, collections] = await Promise.all([
    getTranslations({ locale, namespace: "catalog" }),
    getTranslations({ locale, namespace: "common" }),
    getPublishedCollections(locale),
  ]);

  return (
    <main className="collection-index-page" id="main-content">
      <Breadcrumbs
        locale={locale}
        label={t("breadcrumbs")}
        items={[
          { label: common("home"), href: "/" },
          { label: t("collectionsTitle") },
        ]}
      />
      <header className="collection-index-header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("collectionsTitle")}</h1>
        <p>{t("collectionsIntro")}</p>
      </header>
      {collections.length ? (
        <ol className="collection-index-list">
          {collections.map((collection, index) => (
            <li key={collection.collection_id}>
              <span aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h2>
                  <Link
                    href={`/collections/${collection.slug}`}
                    locale={locale}
                  >
                    {collection.name}
                  </Link>
                </h2>
                {collection.description ? (
                  <p>{collection.description}</p>
                ) : null}
                <p>
                  {t("collectionCount", { count: collection.product_count })}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-state">{t("collectionsEmpty")}</p>
      )}
    </main>
  );
}
