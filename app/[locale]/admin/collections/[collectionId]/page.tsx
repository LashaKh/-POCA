import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { CollectionEditor } from "@/components/admin/catalog/collection-editor";
import { getCatalogCollection } from "@/features/catalog/admin-queries";
import { getCatalogAdminLabels } from "@/features/catalog/admin-copy";
import { Link } from "@/i18n/navigation";
import { isAppLocale, locales } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function CatalogCollectionPage({
  params,
}: {
  params: Promise<{ locale: string; collectionId: string }>;
}) {
  const { locale, collectionId } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);
  const [t, collection] = await Promise.all([
    getTranslations({ locale, namespace: "admin.catalog" }),
    getCatalogCollection(collectionId),
  ]);
  if (!collection) notFound();
  const labels = getCatalogAdminLabels(locale);
  const translations = locales.map((translationLocale) => {
    const translation = collection.collection_translations.find(
      (item) => item.locale === translationLocale,
    );
    return {
      locale: translationLocale,
      slug: translation?.slug ?? "",
      name: translation?.name ?? "",
      description: translation?.description ?? "",
      seoTitle: translation?.seo_title ?? "",
      seoDescription: translation?.seo_description ?? "",
      status: translation?.status ?? "draft",
    };
  });
  const members = [...collection.collection_products]
    .sort((left, right) => left.position - right.position)
    .map((member) => ({
      productId: member.product_id,
      sku: member.products.sku,
      name:
        member.products.product_translations.find(
          (item) => item.locale === locale,
        )?.name ??
        member.products.product_translations.find(
          (item) => item.locale === "en",
        )?.name ??
        member.products.sku,
      featured: member.featured,
    }));
  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <Link href="/admin/collections" locale={locale}>
          {labels.backCollections}
        </Link>
        <p className="eyebrow">{collection.code}</p>
        <h1>{t("collectionEditTitle")}</h1>
        <p>{t("collectionEditIntro")}</p>
      </header>
      <CollectionEditor
        locale={locale}
        labels={labels}
        collection={{
          id: collection.id,
          version: collection.version,
          code: collection.code,
          status: collection.status,
          orderStrategy: collection.order_strategy,
          scheduledAt: collection.scheduled_at,
          translations,
          members,
        }}
      />
    </main>
  );
}
